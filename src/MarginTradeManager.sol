// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ILiquidationEngine.sol";

contract MarginTradeManager {
    ILiquidationEngine public liquidationEngine;

    // Position management
    enum PositionType {
        LONG,
        SHORT
    }

    struct Position {
        address owner;
        address collateralToken;
        uint256 margin;
        uint256 positionSize;
        uint256 entryPrice;
        bool open;
        int256 lastEffectiveMargin;
        uint256 lastMarginRatio;
        uint256 lastUpdated;
        // Trading parameters
        uint256 leverage;
        uint256 sltp;
        bool reduceOnly;
        PositionType positionType;
        // Trading metrics
        uint256 realizedPnL;
        uint256 fees;
    }

    // Supported collateral tokens
    mapping(address => bool) public supportedCollateralTokens;

    // Storage
    // Each user's positions mapped by a unique position ID.
    mapping(address => mapping(uint256 => Position)) public positions;

    // Tracks the list of position IDs for each user (to maintain ordering).
    mapping(address => uint256[]) public userPositionIds;

    // Counter for the number of positions per user (to generate unique IDs).
    mapping(address => uint256) public userPositionCount;
    address[] public tradersWithPositions;

    // Fees configuration
    uint256 public openFeeRate = 10; // 0.1% (in basis points)
    uint256 public closeFeeRate = 15; // 0.15% (in basis points)
    address public feeCollector;

    // Limits
    uint256 public maxLeverage = 100; // 100x max leverage
    uint256 public minMargin = 0.01 ether;

    // SafeERC20 wrapper
    using SafeERC20 for IERC20;

    // Reentrancy lock
    bool private locked;
    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }
    // Events
    event MarginDeposited(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    event MarginWithdrawn(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    event PositionOpened(
        address indexed user,
        uint256 positionSize,
        uint256 entryPrice,
        uint256 leverage,
        uint256 sltp,
        bool reduceOnly,
        PositionType positionType
    );
    event PositionClosed(
        address indexed user,
        int256 profit,
        uint256 fee,
        uint256 exitPrice
    );
    event PositionUpdated(
        address indexed user,
        int256 effectiveMargin,
        uint256 marginRatio,
        uint256 timestamp
    );

    // --- Owner management ---
    address private owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(address _liquidationEngineAddress, address _feeCollector) {
        liquidationEngine = ILiquidationEngine(_liquidationEngineAddress);
        feeCollector = _feeCollector;
        owner = msg.sender; // Set the deployer as the owner
    }

    // --- Admin Functions ---

    function setFeeRates(
        uint256 _openFeeRate,
        uint256 _closeFeeRate
    ) external onlyOwner {
        openFeeRate = _openFeeRate;
        closeFeeRate = _closeFeeRate;
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid address");
        feeCollector = _feeCollector;
    }

    function setMaxLeverage(uint256 _maxLeverage) external onlyOwner {
        require(_maxLeverage > 0, "Max leverage must be > 0");
        maxLeverage = _maxLeverage;
    }

    function setMinMargin(uint256 _minMargin) external onlyOwner {
        minMargin = _minMargin;
    }

    // Function to add supported tokens
    function addSupportedCollateralToken(
        address tokenAddress
    ) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        supportedCollateralTokens[tokenAddress] = true;
    }

    // Function to remove supported tokens
    function removeSupportedCollateralToken(
        address tokenAddress
    ) external onlyOwner {
        supportedCollateralTokens[tokenAddress] = false;
    }

    // --- Trading Functions ---

    /**
     * @notice Deposit margin for trading using ETH
     */
    function depositMargin() external payable {
        require(msg.value > 0, "Deposit must be > 0");

        // Retrieve the user's current position count as the n
        uint256 newPositionId = userPositionCount[msg.sender];

        Position storage pos = positions[msg.sender][newPositionId];
        pos.margin += msg.value;

        // If this is the first deposit, set collateral as ETH (address(0))
        if (pos.margin == 0) {
            pos.collateralToken = address(0); // Use address(0) to represent ETH
        } else {
            // Ensure same collateral type
            require(
                pos.collateralToken == address(0),
                "Cannot mix collateral types"
            );
        }

        emit MarginDeposited(msg.sender, address(0), msg.value);
    }

    /**
     * @notice Deposit margin for trading using ERC20 tokens
     * @param tokenAddress Address of the ERC20 token to deposit
     * @param amount Amount of tokens to deposit
     */
    function depositMarginERC20(
        address tokenAddress,
        uint256 amount
    ) external nonReentrant {
        require(supportedCollateralTokens[tokenAddress], "Token not supported");
        require(amount > 0, "Deposit must be > 0");

        // Retrieve the user's current position count as the n
        uint256 newPositionId = userPositionCount[msg.sender];

        Position storage pos = positions[msg.sender][newPositionId];

        // If this is the first deposit for this position, set the collateral token
        if (pos.margin == 0) {
            pos.collateralToken = tokenAddress;
        } else {
            // If not first deposit, ensure same token is used
            require(
                pos.collateralToken == tokenAddress,
                "Cannot mix collateral tokens"
            );
        }

        // Transfer tokens from user to contract
        IERC20(tokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        // Update margin
        pos.margin += amount;

        emit MarginDeposited(msg.sender, tokenAddress, amount);
    }

    /**
     * @notice Withdraw available margin (margin not locked in positions)
     * @param amount Amount of margin to withdraw
     */
    function withdrawMargin(
        uint256 positionId,
        uint256 amount
    ) external nonReentrant {
        Position storage pos = positions[msg.sender][positionId];
        require(amount > 0, "Withdraw amount must be > 0");

        // Calculate available margin (total margin - locked margin)
        uint256 lockedMargin = 0;
        if (pos.open) {
            // If position is open, calculate required margin based on position size and current price
            uint256 currentPrice = getLatestPrice(pos.collateralToken);
            lockedMargin = (pos.positionSize * currentPrice) / pos.leverage;
        }

        uint256 availableMargin = pos.margin > lockedMargin
            ? pos.margin - lockedMargin
            : 0;
        require(amount <= availableMargin, "Insufficient available margin");

        // Update margin balance
        pos.margin -= amount;

        // Transfer tokens based on collateral type
        if (pos.collateralToken == address(0)) {
            // Transfer ETH
            payable(msg.sender).transfer(amount);
        } else {
            // Transfer ERC20 tokens
            IERC20(pos.collateralToken).safeTransfer(msg.sender, amount);
        }

        emit MarginWithdrawn(msg.sender, pos.collateralToken, amount);
    }

    /**
     * @notice Open a new trading position
     * @param _positionSize The size of the trade
     * @param _leverage The leverage factor (1-100)
     * @param _sltp The stop loss/take profit level (0 if not used)
     * @param _reduceOnly Flag indicating if the order is reduce-only
     * @param _positionType LONG (0) or SHORT (1)
     */
    function openPosition(
        uint256 _positionSize,
        uint256 _leverage,
        uint256 _sltp,
        bool _reduceOnly,
        PositionType _positionType
    ) external nonReentrant {
        // Retrieve the user's current position count as the new position ID.
        uint256 newPositionId = userPositionCount[msg.sender];
        userPositionCount[msg.sender]++;

        // Access or create a Position storage reference for the new ID.
        Position storage pos = positions[msg.sender][newPositionId];

        // Position validation
        require(pos.margin >= minMargin, "Insufficient margin balance");
        require(!pos.open, "Position already open");
        require(_positionSize > 0, "Position size must be > 0");
        require(_leverage > 0 && _leverage <= maxLeverage, "Invalid leverage");

        uint256 currentPrice = getLatestPrice(pos.collateralToken);

        // Calculate required margin
        uint256 requiredMargin = (_positionSize * currentPrice) / _leverage;
        require(
            pos.margin >= requiredMargin,
            "Insufficient margin for position size"
        );

        // Calculate and collect fees
        uint256 positionValue = _positionSize * currentPrice;
        uint256 openFee = _calculateAndCollectFee(
            msg.sender,
            newPositionId,
            positionValue,
            openFeeRate
        );
        // uint256 openFee = (positionValue * openFeeRate) / 10000;
        require(
            pos.margin >= requiredMargin + openFee,
            "Insufficient margin for fees"
        );

        // Update position details
        _updatePositionDetails(
            msg.sender,
            newPositionId,
            _positionSize,
            currentPrice,
            _leverage,
            _sltp,
            _reduceOnly,
            _positionType
        );

        // Record the new position ID for the user.
        userPositionIds[msg.sender].push(newPositionId);

        // For ERC20 tokens, transfer to the fee collector
        if (pos.collateralToken == address(0)) {
            payable(feeCollector).transfer(openFee);
        } else {
            IERC20(pos.collateralToken).safeTransfer(feeCollector, openFee);
        }

        // Add user to active positions if not already there
        bool userExists = false;
        for (uint i = 0; i < tradersWithPositions.length; i++) {
            if (tradersWithPositions[i] == msg.sender) {
                userExists = true;
                break;
            }
        }
        if (!userExists) {
            tradersWithPositions.push(msg.sender);
        }

        emit PositionOpened(
            msg.sender,
            _positionSize,
            currentPrice,
            _leverage,
            _sltp,
            _reduceOnly,
            _positionType
        );
    }

    /**
     * @notice Close an open position
     */
    function closePosition(uint256 positionId) external nonReentrant {
        _closePosition(positionId);
    }

    function _closePosition(uint256 positionId) internal {
        // Retrieve the position using the sender's address and the provided position ID.
        Position storage pos = positions[msg.sender][positionId];
        require(pos.open, "No open position");

        uint256 currentPrice = getLatestPrice(pos.collateralToken);

        // Calculate PnL
        int256 pnl;
        if (pos.positionType == PositionType.LONG) {
            pnl = int256((currentPrice - pos.entryPrice) * pos.positionSize);
        } else {
            pnl = int256((pos.entryPrice - currentPrice) * pos.positionSize);
        }

        // Calculate closing fee
        uint256 positionValue = pos.positionSize * currentPrice;
        uint256 closeFee = (positionValue * closeFeeRate) / 10000;

        // Update realized PnL
        if (pnl > 0) {
            pos.realizedPnL += uint256(pnl);
        }

        // Add PnL to margin (can be negative)
        int256 newMargin = int256(pos.margin) + pnl - int256(closeFee);
        uint256 finalMargin = newMargin > 0 ? uint256(newMargin) : 0;

        // Transfer fee to fee collector based on token type
        if (pos.collateralToken == address(0)) {
            payable(feeCollector).transfer(closeFee);
        } else {
            IERC20(pos.collateralToken).safeTransfer(feeCollector, closeFee);
        }

        // Reset position
        _resetPositionDetails(msg.sender, positionId, finalMargin, closeFee);

        // Remove the closed position from the user's auxiliary array.
        _removePositionId(msg.sender, positionId);

        emit PositionClosed(msg.sender, pnl, closeFee, currentPrice);

        // Remove user from active positions array
        removeTraderFromArray(msg.sender);
    }

    /**
     * @notice Update position metrics with latest price
     */
    function updatePosition(uint256 positionId) external nonReentrant {
        Position storage pos = positions[msg.sender][positionId];
        require(pos.open, "No open position");

        uint256 currentPrice = getLatestPrice(pos.collateralToken);

        // Calculate PnL
        int256 pnl;
        if (pos.positionType == PositionType.LONG) {
            pnl = int256((currentPrice - pos.entryPrice) * pos.positionSize);
        } else {
            pnl = int256((pos.entryPrice - currentPrice) * pos.positionSize);
        }

        // Update metrics
        pos.lastEffectiveMargin = int256(pos.margin) + pnl;

        if (pos.lastEffectiveMargin <= 0) {
            pos.lastMarginRatio = 0;
        } else {
            pos.lastMarginRatio =
                (uint256(pos.lastEffectiveMargin) * 100) /
                (pos.positionSize * currentPrice);
        }

        pos.lastUpdated = block.timestamp;

        emit PositionUpdated(
            msg.sender,
            pos.lastEffectiveMargin,
            pos.lastMarginRatio,
            pos.lastUpdated
        );

        // Check if position should be liquidated
        bool shouldLiquidate = liquidationEngine.checkLiquidation(msg.sender);
        if (shouldLiquidate) {
            // Close position if liquidation is needed
            _closePosition(positionId);
        }
    }

    function _updatePositionDetails(
        address user,
        uint256 positionId,
        uint256 _positionSize,
        uint256 currentPrice,
        uint256 _leverage,
        uint256 _sltp,
        bool _reduceOnly,
        PositionType _positionType
    ) internal {
        Position storage pos = positions[user][positionId];

        // Update position
        pos.positionSize = _positionSize;
        pos.entryPrice = currentPrice;
        pos.open = true;
        pos.leverage = _leverage;
        pos.sltp = _sltp;
        pos.reduceOnly = _reduceOnly;
        pos.positionType = _positionType;

        // Calculate effective margin and margin ratio
        pos.lastEffectiveMargin = int256(pos.margin);
        pos.lastMarginRatio =
            (pos.margin * 100) /
            (pos.positionSize * currentPrice);
        pos.lastUpdated = block.timestamp;
    }

    function _resetPositionDetails(
        address user,
        uint256 positionId,
        uint256 finalMargin,
        uint256 closeFee
    ) internal {
        Position storage pos = positions[user][positionId];

        // Reset position
        pos.open = false;
        pos.positionSize = 0;
        pos.entryPrice = 0;
        pos.leverage = 0;
        pos.sltp = 0;
        pos.reduceOnly = false;
        pos.lastEffectiveMargin = 0;
        pos.lastMarginRatio = 0;

        // Update margin and fees
        pos.margin = finalMargin;
        pos.fees += closeFee;
        pos.lastUpdated = block.timestamp;
    }

    // --- Helper Functions ---

    /**
     * @notice Get the latest price from the price feed
     * @return price The latest price
     */
    function getLatestPrice(
        address tokenAddress
    ) public view returns (uint256 price) {
        return liquidationEngine.getLatestPrice(tokenAddress);
    }

    /**
     * @notice Remove a trader from the active positions array
     * @param trader Address of the trader to remove
     */
    function removeTraderFromArray(address trader) internal {
        for (uint i = 0; i < tradersWithPositions.length; i++) {
            if (tradersWithPositions[i] == trader) {
                // Swap with the last element and pop
                tradersWithPositions[i] = tradersWithPositions[
                    tradersWithPositions.length - 1
                ];
                tradersWithPositions.pop();
                break;
            }
        }
    }

    function _removePositionId(address user, uint256 positionId) internal {
        uint256[] storage ids = userPositionIds[user];
        uint256 len = ids.length;
        for (uint256 i = 0; i < len; i++) {
            if (ids[i] == positionId) {
                // Swap with the last element and pop for efficiency.
                ids[i] = ids[len - 1];
                ids.pop();
                break;
            }
        }
    }

    function _calculateAndCollectFee(
        address user,
        uint256 positionId,
        uint256 positionValue,
        uint256 feeRate
    ) internal returns (uint256) {
        Position storage pos = positions[user][positionId];
        uint256 fee = (positionValue * feeRate) / 10000;

        // Update fees and deduct from margin
        pos.fees += fee;
        pos.margin -= fee;

        // Transfer fee based on collateral type
        if (pos.collateralToken == address(0)) {
            payable(feeCollector).transfer(fee);
        } else {
            IERC20(pos.collateralToken).safeTransfer(feeCollector, fee);
        }

        return fee;
    }
}
