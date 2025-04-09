import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import '../styles/Header.css';

const Header = () => {
    const { account, connectWallet, isInitialized, networkId } = useWeb3();

    // Format account address for display
    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    // Get network name based on network ID
    const getNetworkName = (id) => {
        switch (id) {
            case 1:
                return 'Ethereum Mainnet';
            case 11155111:
                return 'Sepolia Testnet';
            case 5:
                return 'Goerli Testnet';
            default:
                return `Network ID: ${id}`;
        }
    };

    return (
        <header className="header">
            <div className="logo">
                <h1>Margin Trading DApp</h1>
            </div>
            <div className="network-info">
                {networkId && (
                    <div className="network-badge">
                        {getNetworkName(networkId)}
                    </div>
                )}
            </div>
            <div className="wallet-connect">
                {!isInitialized ? (
                    <button className="connect-button" onClick={connectWallet}>
                        Connect Wallet
                    </button>
                ) : (
                    <div className="account-info">
                        <div className="account-address">
                            {formatAddress(account)}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
