// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MockToken.sol";
import "../src/LiquidationEngine.sol";
import "../src/MarginTradeManager.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockToken for testing
        MockToken token = new MockToken("Mock Token", "MTK", 18);
        console.log("MockToken deployed at:", address(token));

        // Deploy LiquidationEngine
        LiquidationEngine liquidationEngine = new LiquidationEngine();
        console.log("LiquidationEngine deployed at:", address(liquidationEngine));

        // Deploy MarginTradeManager
        // Using deployer address as fee collector for testing
        MarginTradeManager marginTradeManager = new MarginTradeManager(
            address(liquidationEngine),
            msg.sender
        );
        console.log("MarginTradeManager deployed at:", address(marginTradeManager));

        // Configure MarginTradeManager
        // Add MockToken as supported collateral
        marginTradeManager.addSupportedCollateralToken(address(token));

        // Set initial configuration
        marginTradeManager.setFeeRates(10, 15); // 0.1% open fee, 0.15% close fee
        marginTradeManager.setMaxLeverage(100); // 100x max leverage
        marginTradeManager.setMinMargin(0.01 ether); // 0.01 ETH minimum margin

        vm.stopBroadcast();
    }
} 