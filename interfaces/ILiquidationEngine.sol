// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
interface ILiquidationEngine {
    enum PositionType { LONG, SHORT }
    
    function getLatestPrice(address tokenAddress) external view returns (uint256 price);
    
    function checkLiquidation(address user) external view returns (bool eligible);
    
    function registerPosition(
        address user,
        uint256 margin,
        uint256 positionSize,
        uint256 entryPrice,
        uint256 leverage,
        uint256 sltp,
        bool reduceOnly,
        PositionType positionType
    ) external;
    
    function updatePositionMetrics(
        address user,
        uint256 margin,
        int256 effectiveMargin,
        uint256 marginRatio
    ) external;
    
    function deregisterPosition(address user) external;
    
    function liquidatePosition(address user) external returns (bool);
}