import Web3 from 'web3';
import MarginTradeManager from '../abis/MarginTradeManager.json';
import MockToken from '../abis/MockToken.json';

// Contract addresses from deployment
export const CONTRACT_ADDRESSES = {
    MOCK_TOKEN: '0x6Bb00934FD4f6db39F475Bf39283981A20eCCe5b',
    LIQUIDATION_ENGINE: '0x290346048a11574A6bEb6E0B3B0E353b0bE1cD0D',
    MARGIN_TRADE_MANAGER: '0xfD79e1b120f3aE000f2d79aCEca92Aaec0B34C14'
};

// Network configuration
export const NETWORK_CONFIG = {
    chainId: '0xaa36a7', // Sepolia testnet
    chainName: 'Sepolia Testnet',
    rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/_Pq8AyLTn8KISb8Bd4YPucjVyZOz9jJC'],
    nativeCurrency: {
        name: 'Sepolia ETH',
        symbol: 'ETH',
        decimals: 18
    },
    blockExplorerUrls: ['https://sepolia.etherscan.io']
};

// Contract ABIs
export const CONTRACT_ABIS = {
    MARGIN_TRADE_MANAGER: MarginTradeManager.abi,
    MOCK_TOKEN: MockToken.abi
};

// Initialize Web3
export const initWeb3 = async () => {
    if (window.ethereum) {
        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const web3 = new Web3(window.ethereum);
            return web3;
        } catch (error) {
            console.error('User denied account access:', error);
            throw error;
        }
    } else {
        console.error('Please install MetaMask!');
        throw new Error('Please install MetaMask!');
    }
};

// Initialize contracts
export const initContracts = (web3) => {
    const marginTradeManager = new web3.eth.Contract(
        CONTRACT_ABIS.MARGIN_TRADE_MANAGER,
        CONTRACT_ADDRESSES.MARGIN_TRADE_MANAGER
    );

    const mockToken = new web3.eth.Contract(
        CONTRACT_ABIS.MOCK_TOKEN,
        CONTRACT_ADDRESSES.MOCK_TOKEN
    );

    return {
        marginTradeManager,
        mockToken
    };
}; 