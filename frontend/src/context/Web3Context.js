import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';

// Import ABIs
import MarginTradeManagerABI from '../abis/MarginTradeManager.json';
import MockTokenABI from '../abis/MockToken.json';
import LiquidationEngineABI from '../contracts/MockPriceFeed.json'; 

// Create the context
const Web3Context = createContext();

// Contract addresses for Sepolia testnet - UPDATED WITH NEWLY DEPLOYED CONTRACTS
const CONTRACT_ADDRESSES = {
    marginTradeManager: "0x69189D25Cf04ba71C5feec4C8Cc6f2a9B8986834",
    mockToken: "0x6399a31B08986628EAdfD6e616E58db75f6686f2",
    liquidationEngine: "0xc128F74caBB74b5797e0d8727b91bA3BA4F67647"
};

// Custom hook to use the Web3 context
export const useWeb3 = () => useContext(Web3Context);

// Provider component
export const Web3Provider = ({ children }) => {
    const [web3, setWeb3] = useState(null);
    const [account, setAccount] = useState(null);
    const [networkId, setNetworkId] = useState(null);
    const [contracts, setContracts] = useState({
        marginTradeManager: null,
        mockToken: null,
        liquidationEngine: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [userMargin, setUserMargin] = useState('0');
    const [userTokenMargin, setUserTokenMargin] = useState('0');

    // Initialize contracts
    const initializeContracts = useCallback(async (web3Instance, networkId) => {
        console.log("Initializing contracts...");
        try {
            if (!web3Instance) {
                console.error("Web3 instance is null");
                setError("Web3 instance is not available. Please refresh the page.");
                return false;
            }

            try {
                // Create contract instances
                const marginTradeManagerContract = new web3Instance.eth.Contract(
                    MarginTradeManagerABI.abi,
                    CONTRACT_ADDRESSES.marginTradeManager
                );

                const mockTokenContract = new web3Instance.eth.Contract(
                    MockTokenABI.abi,
                    CONTRACT_ADDRESSES.mockToken
                );

                const liquidationEngineContract = new web3Instance.eth.Contract(
                    LiquidationEngineABI.abi,
                    CONTRACT_ADDRESSES.liquidationEngine
                );

                // Set the contracts in state without verification
                setContracts({
                    marginTradeManager: marginTradeManagerContract,
                    mockToken: mockTokenContract,
                    liquidationEngine: liquidationEngineContract
                });

                console.log("Contracts initialized successfully:", {
                    marginTradeManager: marginTradeManagerContract.options.address,
                    mockToken: mockTokenContract.options.address,
                    liquidationEngine: liquidationEngineContract.options.address
                });
                
                setIsInitialized(true);
                setLoading(false);
                return true;
            } catch (contractError) {
                console.error("Error creating contract instances:", contractError);
                setError("Failed to create contract instances. Please check your network connection.");
                setLoading(false);
                return false;
            }
        } catch (error) {
            console.error("Error initializing contracts:", error);
            setError("Failed to initialize contracts. Please refresh the page and try again.");
            setLoading(false);
            return false;
        }
    }, []);

    // Connect wallet function for button
    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                setLoading(true);
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
                
                setLoading(false);
                return true;
            } catch (error) {
                console.error("Error connecting wallet:", error);
                setError("Failed to connect wallet. Please try again.");
                setLoading(false);
                return false;
            }
        } else {
            setError("No Ethereum browser extension detected. Please install MetaMask to use this application.");
            return false;
        }
    };

    // Initialize web3 and contracts when the component mounts
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
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
                        
                        // Check if connected to Sepolia (network ID 11155111)
                        if (networkId !== 11155111) {
                            console.warn("Not connected to Sepolia testnet. Please switch networks in MetaMask.");
                            setError("Please connect to the Sepolia testnet in your MetaMask wallet.");
                        }
                        
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
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error initializing web3:", error);
                setError("Failed to initialize web3. Please refresh the page and try again.");
                setLoading(false);
            }
        };
        
        init();
        
        // Setup event listeners for MetaMask
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
        
    }, [initializeContracts]);

    // Fetch user margin data
    useEffect(() => {
        const fetchUserMargin = async () => {
            if (web3 && contracts.marginTradeManager && account && isInitialized) {
                try {
                    console.log("Fetching user margin data...");
                    // Get ETH margin
                    const ethMargin = await contracts.marginTradeManager.methods.userMargin(account).call();
                    setUserMargin(web3.utils.fromWei(ethMargin, 'ether'));
                    
                    // Get token margin
                    const tokenMargin = await contracts.marginTradeManager.methods.userTokenMargin(
                        account, 
                        contracts.mockToken.options.address
                    ).call();
                    setUserTokenMargin(web3.utils.fromWei(tokenMargin, 'ether'));
                    
                    console.log("User margins fetched:", {
                        ethMargin: web3.utils.fromWei(ethMargin, 'ether'),
                        tokenMargin: web3.utils.fromWei(tokenMargin, 'ether')
                    });
                } catch (error) {
                    console.error("Error fetching user margin:", error);
                }
            }
        };
        
        if (isInitialized) {
            fetchUserMargin();
            
            // Set up an interval to fetch user margin every 30 seconds
            const intervalId = setInterval(fetchUserMargin, 30000);
            
            return () => clearInterval(intervalId);
        }
    }, [web3, contracts, account, isInitialized]);

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
            userMargin,
            userTokenMargin
        }}>
            {children}
        </Web3Context.Provider>
    );
};