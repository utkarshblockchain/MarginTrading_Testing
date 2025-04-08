import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import '../styles/Header.css';

const Header = () => {
    const { connectWallet, account, networkId, forceInitialize, isInitialized } = useWeb3();

    const getNetworkName = (id) => {
        switch(id) {
            case 1: return 'Ethereum Mainnet';
            case 5: return 'Goerli Testnet';
            case 11155111: return 'Sepolia Testnet';
            case 1337: return 'Local Development';
            case 31337: return 'Hardhat Network';
            default: return `Network ID: ${id}`;
        }
    };

    const handleForceInitialize = async () => {
        await forceInitialize();
    };

    return (
        <header className="app-header">
            <div className="header-content">
                <h1 className="app-title">Margin Trading DApp</h1>
                <div className="connection-status">
                    {!account ? (
                        <button onClick={connectWallet} className="connect-button">
                            Connect Wallet
                        </button>
                    ) : (
                        <div className="account-info">
                            <div className="network-badge">
                                {networkId ? getNetworkName(networkId) : 'Unknown Network'}
                            </div>
                            <div className="account-address">
                                {account.slice(0, 6)}...{account.slice(-4)}
                            </div>
                            {!isInitialized && (
                                <button 
                                    onClick={handleForceInitialize} 
                                    className="initialize-button"
                                >
                                    Initialize Contracts
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
