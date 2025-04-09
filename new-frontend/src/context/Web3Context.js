import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';

// Import ABIs
import MarginTradeManagerABI from '../abis/MarginTradeManager.json';
import MockTokenABI from '../abis/MockToken.json';

// Create the context
const Web3Context = createContext();

// Contract addresses for Sepolia testnet
const CONTRACT_ADDRESSES = {
    marginTradeManager: "0x69189D25Cf04ba71C5feec4C8Cc6f2a9B8986834",
    mockToken: "0x6399a31B08986628EAdfD6e616E58db75f6686f2"
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
        mockToken: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // Position and margin state
    const [positions, setPositions] = useState([]);
    const [ethMargin, setEthMargin] = useState('0');
    const [tokenMargin, setTokenMargin] = useState('0');
    const [positionCount, setPositionCount] = useState(0);

    // Initialize contracts
    const initializeContracts = useCallback(async (web3Instance) => {
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

                // Set the contracts in state
                setContracts({
                    marginTradeManager: marginTradeManagerContract,
                    mockToken: mockTokenContract
                });

                console.log("Contracts initialized successfully:", {
                    marginTradeManager: marginTradeManagerContract.options.address,
                    mockToken: mockTokenContract.options.address
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
                
                // Create a new web3 instance
                const web3Instance = new Web3(window.ethereum);
                setWeb3(web3Instance);
                
                // Get network ID
                const networkId = await web3Instance.eth.net.getId();
                setNetworkId(networkId);
                
                // Initialize contracts
                await initializeContracts(web3Instance);
                
                setLoading(false);
            } catch (error) {
                console.error("Error connecting wallet:", error);
                setError("Failed to connect wallet. Please try again.");
                setLoading(false);
            }
        } else {
            setError("No Ethereum browser extension detected. Please install MetaMask to use this application.");
            setLoading(false);
        }
    };

    // Initialize web3
    const init = useCallback(async () => {
        try {
            setLoading(true);
            
            // Check if MetaMask is installed
            if (window.ethereum) {
                try {
                    // Create a new web3 instance
                    const web3Instance = new Web3(window.ethereum);
                    
                    // Get accounts
                    const accounts = await web3Instance.eth.getAccounts();
                    if (accounts.length > 0) {
                        setAccount(accounts[0]);
                        console.log("Connected account:", accounts[0]);
                    }
                    
                    // Get network ID
                    const networkId = await web3Instance.eth.net.getId();
                    setNetworkId(networkId);
                    console.log("Connected to network ID:", networkId);
                    
                    setWeb3(web3Instance);
                    
                    // Initialize contracts
                    const success = await initializeContracts(web3Instance);
                    if (success) {
                        setIsInitialized(true);
                    }
                } catch (innerError) {
                    console.error("Error in Ethereum connection:", innerError);
                    setError("Error connecting to Ethereum. Please refresh and try again.");
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
    }, [initializeContracts]);

    // Fetch user position data
    const fetchUserPositions = useCallback(async () => {
        if (!web3 || !contracts.marginTradeManager || !account || !isInitialized) {
            console.log("Cannot fetch positions: web3, contracts, or account not initialized");
            return;
        }
        
        try {
            console.log("Fetching user position data...");
            
            // Get position count
            const count = await contracts.marginTradeManager.methods.userPositionCount(account).call();
            setPositionCount(parseInt(count));
            console.log("User position count:", count);
            
            // Initialize arrays to calculate total margins
            let totalEthMargin = web3.utils.toBN('0');
            let totalTokenMargin = web3.utils.toBN('0');
            const positionsData = [];
            
            // Fetch each position
            for (let i = 0; i < count; i++) {
                const position = await contracts.marginTradeManager.methods.positions(account, i).call();
                console.log(`Position ${i}:`, position);
                
                // Add position to array
                positionsData.push({
                    id: i,
                    ...position,
                    isEth: position.collateralToken === '0x0000000000000000000000000000000000000000'
                });
                
                // Calculate margins
                const margin = web3.utils.toBN(position.margin);
                if (position.collateralToken.toLowerCase() === '0x0000000000000000000000000000000000000000') {
                    totalEthMargin = totalEthMargin.add(margin);
                } else if (position.collateralToken.toLowerCase() === contracts.mockToken.options.address.toLowerCase()) {
                    totalTokenMargin = totalTokenMargin.add(margin);
                }
            }
            
            // Update state
            setPositions(positionsData);
            setEthMargin(web3.utils.fromWei(totalEthMargin, 'ether'));
            setTokenMargin(web3.utils.fromWei(totalTokenMargin, 'ether'));
            
            console.log("User margins calculated:", {
                ethMargin: web3.utils.fromWei(totalEthMargin, 'ether'),
                tokenMargin: web3.utils.fromWei(totalTokenMargin, 'ether')
            });
        } catch (error) {
            console.error("Error fetching user positions:", error);
        }
    }, [web3, contracts, account, isInitialized]);

    // Initialize on component mount
    useEffect(() => {
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
        
        return () => {
            // Clean up event listeners
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', () => {});
                window.ethereum.removeListener('chainChanged', () => {});
            }
        };
    }, [init]);

    // Fetch user position data when account or contracts change
    useEffect(() => {
        if (isInitialized && account) {
            fetchUserPositions();
            
            // Set up an interval to fetch user position data every 30 seconds
            const intervalId = setInterval(fetchUserPositions, 30000);
            
            return () => clearInterval(intervalId);
        }
    }, [isInitialized, account, fetchUserPositions]);

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
            positions,
            ethMargin,
            tokenMargin,
            positionCount,
            fetchUserPositions
        }}>
            {children}
        </Web3Context.Provider>
    );
};
