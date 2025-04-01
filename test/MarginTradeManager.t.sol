// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/MarginTradeManager.sol";
import "../interfaces/ILiquidationEngine.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock token for testing
contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MTK") {
        _mint(msg.sender, 1000000 ether);
    }
}

// Mock liquidation engine for testing
contract MockLiquidationEngine is ILiquidationEngine {
    uint256 private price;

    constructor() {
        price = 1000 * 1e18; // Initial price of 1000 USD
    }

    function getLatestPrice(address) external view returns (uint256) {
        return price;
    }
    
    function updatePrice(address, uint256 newPrice) external {
        price = newPrice;
    }
    
    function checkLiquidation(address) external pure returns (bool) {
        return false;
    }
    
    function registerPosition(
        address,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        bool,
        PositionType
    ) external {}
    
    function updatePositionMetrics(
        address,
        uint256,
        int256,
        uint256
    ) external {}
    
    function deregisterPosition(address) external {}
    
    function liquidatePosition(address) external pure returns (bool) {
        return false;
    }
}

contract MarginTradeManagerTest is Test {
    MarginTradeManager public manager;
    MockLiquidationEngine public liquidationEngine;
    MockToken public token;
    
    address public owner;
    address public user;
    address public feeCollector;
    
    uint256 constant INITIAL_BALANCE = 1000 ether;
    uint256 constant INITIAL_TOKEN_BALANCE = 1000 ether;
    
    event MarginDeposited(address indexed user, address indexed token, uint256 amount);
    event PositionOpened(
        address indexed user,
        uint256 positionSize,
        uint256 entryPrice,
        uint256 leverage,
        uint256 sltp,
        bool reduceOnly,
        MarginTradeManager.PositionType positionType
    );
    
    function setUp() public {
        owner = makeAddr("owner");
        user = makeAddr("user");
        feeCollector = makeAddr("feeCollector");
        
        vm.startPrank(owner);
        liquidationEngine = new MockLiquidationEngine();
        manager = new MarginTradeManager(address(liquidationEngine), feeCollector);
        token = new MockToken();
        
        // Add token as supported collateral
        manager.addSupportedCollateralToken(address(token));
        vm.stopPrank();
        
        // Fund user with ETH and tokens
        vm.deal(user, INITIAL_BALANCE);
        vm.startPrank(owner);
        token.transfer(user, INITIAL_TOKEN_BALANCE);
        vm.stopPrank();
        
        // Approve token spending
        vm.prank(user);
        token.approve(address(manager), type(uint256).max);
    }
    
    function testInitialSetup() public {
        assertEq(address(manager.liquidationEngine()), address(liquidationEngine));
        assertEq(manager.feeCollector(), feeCollector);
        assertTrue(manager.supportedCollateralTokens(address(token)));
        assertEq(user.balance, INITIAL_BALANCE);
        assertEq(token.balanceOf(user), INITIAL_TOKEN_BALANCE);
    }
    
    function testDepositETHMargin() public {
        uint256 depositAmount = 50 ether;
        
        vm.prank(user);
        vm.expectEmit(true, true, false, true);
        emit MarginDeposited(user, address(0), depositAmount);
        manager.depositMargin{value: depositAmount}();
        
        (,, uint256 margin,,,,,,,,,,,,) = manager.positions(user, 0);
        assertEq(margin, depositAmount);
    }
    
    function testDepositERC20Margin() public {
        uint256 depositAmount = 50 ether;
        
        vm.prank(user);
        vm.expectEmit(true, true, false, true);
        emit MarginDeposited(user, address(token), depositAmount);
        manager.depositMarginERC20(address(token), depositAmount);
        
        (,, uint256 margin,,,,,,,,,,,,) = manager.positions(user, 0);
        assertEq(margin, depositAmount);
    }
    
    // function testOpenAndClosePosition() public {
    //     // First deposit some margin
    //     uint256 depositAmount = 1 ether;
    //     vm.prank(user);
    //     manager.depositMargin{value: depositAmount}();

    //     // Open a long position
    //     vm.prank(user);
    //     manager.openPosition(
    //         100, // position size
    //         10,  // leverage
    //         0,   // sltp
    //         false, // reduce only
    //         MarginTradeManager.PositionType.LONG
    //     );

    //     // Verify position details after opening
    //     (,,,,, bool open, int256 lastEffectiveMargin, uint256 lastMarginRatio, uint256 lastUpdated, uint256 leverage, uint256 sltp, bool reduceOnly, MarginTradeManager.PositionType positionType, uint256 realizedPnL, uint256 fees) = manager.positions(user, 0);
    //     assertTrue(open, "Position should be open");
    //     assertEq(leverage, 10, "Incorrect leverage");
    //     assertEq(uint256(positionType), uint256(MarginTradeManager.PositionType.LONG), "Incorrect position type");

    //     // Simulate price increase (from 1000 to 1100)
    //     liquidationEngine.updatePrice(address(0), 1100 ether);

    //     // Close the position
    //     vm.prank(user);
    //     manager.closePosition(0);

    //     // Verify position details after closing
    //     (,,,,, bool isOpen, int256 finalMargin, uint256 finalMarginRatio, uint256 finalUpdated, uint256 finalLeverage, uint256 finalSltp, bool finalReduceOnly, MarginTradeManager.PositionType finalPositionType, uint256 finalPnL, uint256 finalFees) = manager.positions(user, 0);
    //     assertFalse(isOpen, "Position should be closed");
    //     assertEq(finalLeverage, 0, "Position size should be zero");
    //     assertGt(finalPnL, 0, "Should have positive PnL");
    //     assertGt(finalFees, 0, "Should have collected fees");
    // }
    
    function test_RevertWhen_InsufficientMargin() public {
        vm.prank(user);
        vm.expectRevert("Insufficient margin balance");
        manager.openPosition(
            1 ether,
            10,
            0,
            false,
            MarginTradeManager.PositionType.LONG
        );
    }
    
    function test_RevertWhen_ExceedMaxLeverage() public {
        uint256 depositAmount = 50 ether;
        vm.startPrank(user);
        manager.depositMargin{value: depositAmount}();
        
        vm.expectRevert("Invalid leverage");
        manager.openPosition(
            1 ether,
            101, // Max leverage is 100
            0,
            false,
            MarginTradeManager.PositionType.LONG
        );
        vm.stopPrank();
    }
} 