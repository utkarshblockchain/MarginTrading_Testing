import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import '../styles/Header.css';

const Header = () => {
    const { connectWallet, account, networkId, isInitialized, loading, error } = useWeb3();
    const [connecting, setConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

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

    const handleConnectWallet = async () => {
        try {
            setConnecting(true);
            setConnectionError(null);
            const success = await connectWallet();
            if (!success) {
                setConnectionError("Failed to connect wallet. Please try again.");
            }
        } catch (error) {
            console.error("Error connecting wallet:", error);
            setConnectionError(error.message || "Failed to connect wallet");
        } finally {
            setConnecting(false);
        }
    };

    return (
        <header className="app-header">
            <div className="header-content">
                <h1 className="app-title">Margin Trading DApp</h1>
                <div className="connection-status">
                    {!account ? (
                        <div className="wallet-connection">
                            <button 
                                onClick={handleConnectWallet} 
                                className="connect-button"
                                disabled={connecting || loading}
                            >
                                {connecting ? "Connecting..." : "Connect Wallet"}
                            </button>
                            {connectionError && <p className="error-message small">{connectionError}</p>}
                            {error && <p className="error-message small">{error}</p>}
                        </div>
                    ) : (
                        <div className="account-info">
                            <div className="network-badge">
                                {networkId ? getNetworkName(networkId) : 'Unknown Network'}
                            </div>
                            <div className="account-address">
                                {account.slice(0, 6)}...{account.slice(-4)}
                            </div>
                            {isInitialized && (
                                <div className="connection-badge success">
                                    Connected
                                </div>
                            )}
                            {!isInitialized && (
                                <div className="connection-badge warning">
                                    Connecting to contracts...
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
