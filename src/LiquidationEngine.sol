// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/ILiquidationEngine.sol";

contract LiquidationEngine is ILiquidationEngine {
    // Mapping to store prices for different tokens
    mapping(address => uint256) private tokenPrices;
    
    // Minimum margin ratio required (e.g., 5% = 500)
    uint256 public constant MIN_MARGIN_RATIO = 500;
    
    // Mapping to store position details
    mapping(address => Position) private positions;
    
    struct Position {
        uint256 margin;
        uint256 positionSize;
        uint256 entryPrice;
        uint256 leverage;
        uint256 sltp;
        bool reduceOnly;
        PositionType positionType;
        int256 effectiveMargin;
        uint256 marginRatio;
    }
    
    // Events
    event PriceUpdated(address indexed token, uint256 price);
    event PositionRegistered(address indexed user, uint256 margin, uint256 positionSize);
    event PositionDeregistered(address indexed user);
    event PositionLiquidated(address indexed user);
    
    // Function to update price for a token
    function updatePrice(address token, uint256 price) external {
        tokenPrices[token] = price;
        emit PriceUpdated(token, price);
    }
    
    function getLatestPrice(address token) external view returns (uint256) {
        return tokenPrices[token];
    }
    
    function checkLiquidation(address user) external view returns (bool) {
        Position storage pos = positions[user];
        return pos.marginRatio < MIN_MARGIN_RATIO;
    }
    
    function registerPosition(
        address user,
        uint256 margin,
        uint256 positionSize,
        uint256 entryPrice,
        uint256 leverage,
        uint256 sltp,
        bool reduceOnly,
        PositionType positionType
    ) external override {
        positions[user] = Position({
            margin: margin,
            positionSize: positionSize,
            entryPrice: entryPrice,
            leverage: leverage,
            sltp: sltp,
            reduceOnly: reduceOnly,
            positionType: positionType,
            effectiveMargin: int256(margin),
            marginRatio: (margin * 10000) / (positionSize * entryPrice)
        });
        emit PositionRegistered(user, margin, positionSize);
    }
    
    function updatePositionMetrics(
        address user,
        uint256 margin,
        int256 effectiveMargin,
        uint256 marginRatio
    ) external override {
        Position storage pos = positions[user];
        pos.margin = margin;
        pos.effectiveMargin = effectiveMargin;
        pos.marginRatio = marginRatio;
    }
    
    function deregisterPosition(address user) external override {
        delete positions[user];
        emit PositionDeregistered(user);
    }
    
    function liquidatePosition(address user) external override returns (bool) {
        Position storage pos = positions[user];
        if (pos.marginRatio < MIN_MARGIN_RATIO) {
            delete positions[user];
            emit PositionLiquidated(user);
            return true;
        }
        return false;
    }
} 