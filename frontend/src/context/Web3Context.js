import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';

// Import ABIs
import MarginTradeManagerABI from '../abis/MarginTradeManager.json';
import MockTokenABI from '../abis/MockToken.json';
import LiquidationEngineABI from '../contracts/MockPriceFeed.json'; // Using MockPriceFeed ABI for now

// Create the context
const Web3Context = createContext();

// Contract addresses for Sepolia testnet
const CONTRACT_ADDRESSES = {
    marginTrading: "0xfd79e1b120f3ae000f2d79aceca92aaec0b34c14",
    mockToken: "0x6bb00934fd4f6db39f475bf39283981a20ecce5b",
    liquidationEngine: "0x290346048a11574a6beb6e0b3b0e353b0be1cd0d"
};

// Custom hook to use the Web3 context
export const useWeb3 = () => useContext(Web3Context);

// Provider component
export const Web3Provider = ({ children }) => {
    const [web3, setWeb3] = useState(null);
    const [account, setAccount] = useState(null);
    const [networkId, setNetworkId] = useState(null);
    const [contracts, setContracts] = useState({
        marginTrading: null,
        mockToken: null,
        liquidationEngine: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize web3
    const initializeWeb3 = useCallback(async () => {
        try {
            let web3Instance;
            
            // Check if MetaMask is installed
            if (window.ethereum) {
                web3Instance = new Web3(window.ethereum);
                console.log("Using window.ethereum provider");
                
                try {
                    // Request account access
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    setAccount(accounts[0]);
                    console.log("Connected account:", accounts[0]);
                    
                    // Get network ID
                    const networkId = await web3Instance.eth.net.getId();
                    setNetworkId(networkId);
                    console.log("Connected to network ID:", networkId);
                    
                    setWeb3(web3Instance);
                    
                    // Initialize contracts
                    const success = await initializeContracts(web3Instance, networkId);
                    if (success) {
                        setIsInitialized(true);
                    }
                    
                } catch (error) {
                    console.error("User denied account access or there was an error:", error);
                    setError("Failed to connect to your wallet. Please try again.");
                }
            } else if (window.web3) {
                // Legacy dapp browsers
                web3Instance = new Web3(window.web3.currentProvider);
                console.log("Using legacy web3 provider");
                
                // Get accounts
                const accounts = await web3Instance.eth.getAccounts();
                setAccount(accounts[0]);
                console.log("Connected account:", accounts[0]);
                
                // Get network ID
                const networkId = await web3Instance.eth.net.getId();
                setNetworkId(networkId);
                console.log("Connected to network ID:", networkId);
                
                setWeb3(web3Instance);
                
                // Initialize contracts
                const success = await initializeContracts(web3Instance, networkId);
                if (success) {
                    setIsInitialized(true);
                }
                
            } else {
                console.error("No Ethereum browser extension detected");
                setError("No Ethereum browser extension detected. Please install MetaMask to use this application.");
            }
        } catch (error) {
            console.error("Error initializing web3:", error);
            setError("Failed to initialize web3. Please refresh the page and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Initialize contracts
    const initializeContracts = async (web3Instance, networkId) => {
        try {
            console.log("Initializing contracts for network ID:", networkId);

            if (!web3Instance) {
                console.error("Web3 instance is null");
                setError("Web3 instance is not initialized");
                return false;
            }

            // For testing purposes, allow any network ID
            // In production, you would want to restrict to Sepolia (11155111)
            console.log(`Connected to network ${networkId}, proceeding with contract initialization`);

            // Use the contract addresses from the constant
            const marginTradingAddress = CONTRACT_ADDRESSES.marginTrading;
            const mockTokenAddress = CONTRACT_ADDRESSES.mockToken;
            const liquidationEngineAddress = CONTRACT_ADDRESSES.liquidationEngine;

            if (!marginTradingAddress || !mockTokenAddress || !liquidationEngineAddress) {
                console.error("One or more contract addresses are undefined");
                setError("Contract addresses are not properly configured");
                return false;
            }

            console.log("Using contract addresses:", {
                marginTradingAddress,
                mockTokenAddress,
                liquidationEngineAddress
            });

            // Verify ABIs are loaded
            if (!MarginTradeManagerABI || !MockTokenABI || !LiquidationEngineABI) {
                console.error("One or more ABIs are undefined");
                setError("Contract ABIs are not properly loaded");
                return false;
            }

            try {
                // Initialize contract instances
                const marginTradingContract = new web3Instance.eth.Contract(
                    MarginTradeManagerABI,
                    marginTradingAddress
                );

                const mockTokenContract = new web3Instance.eth.Contract(
                    MockTokenABI,
                    mockTokenAddress
                );

                const liquidationEngineContract = new web3Instance.eth.Contract(
                    LiquidationEngineABI,
                    liquidationEngineAddress
                );

                // Verify contract instances
                if (!marginTradingContract || !mockTokenContract || !liquidationEngineContract) {
                    console.error("One or more contract instances failed to initialize");
                    setError("Failed to initialize contract instances");
                    return false;
                }

                // Try to call a simple view function to verify contract connection
                try {
                    // Test if we can call a function on the contract
                    await marginTradingContract.methods.owner().call();
                    console.log("Successfully called contract function");
                } catch (callError) {
                    console.error("Error calling contract function:", callError);
                    // Continue anyway, as the contract might still be usable
                }

                // Set the contracts in state
                setContracts({
                    marginTrading: marginTradingContract,
                    mockToken: mockTokenContract,
                    liquidationEngine: liquidationEngineContract
                });

                console.log("Contracts initialized successfully:", {
                    marginTrading: marginTradingContract.options.address,
                    mockToken: mockTokenContract.options.address,
                    liquidationEngine: liquidationEngineContract.options.address
                });
                
                return true;
            } catch (contractError) {
                console.error("Error creating contract instances:", contractError);
                setError("Failed to create contract instances. Please check your network connection.");
                return false;
            }
        } catch (error) {
            console.error("Error initializing contracts:", error);
            setError("Failed to initialize contracts. Please refresh the page and try again.");
            return false;
        }
    };

    // Connect wallet function for button
    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setAccount(accounts[0]);
                console.log("Wallet connected:", accounts[0]);
                
                // Re-initialize contracts if they weren't initialized before
                if (!isInitialized && web3) {
                    const networkId = await web3.eth.net.getId();
                    const success = await initializeContracts(web3, networkId);
                    if (success) {
                        setIsInitialized(true);
                    }
                }
            } catch (error) {
                console.error("Error connecting wallet:", error);
                setError("Failed to connect wallet. Please try again.");
            }
        } else {
            setError("No Ethereum browser extension detected. Please install MetaMask to use this application.");
        }
    };

    // Initialize web3 and contracts when the component mounts
    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    console.log("Account changed:", accounts[0]);
                } else {
                    setAccount(null);
                    console.log("Account disconnected");
                }
            });

            window.ethereum.on('chainChanged', () => {
                console.log("Network changed, reloading page");
                window.location.reload();
            });
        }
        
        initializeWeb3();
    }, [initializeWeb3]);

    // Force contract initialization if it failed initially
    const forceInitialize = async () => {
        if (web3 && account) {
            const networkId = await web3.eth.net.getId();
            const success = await initializeContracts(web3, networkId);
            if (success) {
                setIsInitialized(true);
                return true;
            }
        }
        return false;
    };

    return (
        <Web3Context.Provider value={{ 
            web3, 
            account, 
            networkId, 
            contracts, 
            loading, 
            error,
            connectWallet,
            isInitialized,
            forceInitialize
        }}>
            {children}
        </Web3Context.Provider>
    );
};