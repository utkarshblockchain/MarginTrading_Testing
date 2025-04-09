import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

const AccountInfo = () => {
    const { contracts, account, web3, isInitialized, userMargin, userTokenMargin } = useWeb3();
    const [balance, setBalance] = useState('0');
    const [tokenBalance, setTokenBalance] = useState('0');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [positionCount, setPositionCount] = useState('0');
    const [isTokenSupported, setIsTokenSupported] = useState(false);

    const fetchBalances = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!web3 || !account || !isInitialized) {
                setLoading(false);
                return;
            }

            // Get ETH balance
            const ethBalance = await web3.eth.getBalance(account);
            setBalance(web3.utils.fromWei(ethBalance, 'ether'));

            // Get token balance if contract is initialized
            if (contracts.mockToken) {
                const tokenBalance = await contracts.mockToken.methods
                    .balanceOf(account)
                    .call();
                setTokenBalance(web3.utils.fromWei(tokenBalance, 'ether'));
            }

            // Get position count if contract is initialized
            if (contracts.marginTradeManager) {
                try {
                    const count = await contracts.marginTradeManager.methods
                        .userPositionCount(account)
                        .call();
                    setPositionCount(count);
                } catch (posError) {
                    console.error("Error fetching position count:", posError);
                }
            }

            // Check if token is supported
            if (contracts.marginTradeManager && contracts.mockToken) {
                const supported = await contracts.marginTradeManager.methods
                    .supportedCollateralTokens(contracts.mockToken.options.address)
                    .call();
                setIsTokenSupported(supported);
            }

        } catch (error) {
            console.error("Error fetching balances:", error);
            setError(error.message || "Failed to fetch account information");
        } finally {
            setLoading(false);
        }
    };

    const addTokenAsCollateral = async () => {
        if (!web3 || !account || !contracts.marginTradeManager || !contracts.mockToken) {
            setError("Web3 or contracts not initialized");
            return;
        }

        try {
            setLoading(true);
            await contracts.marginTradeManager.methods
                .addSupportedCollateralToken(contracts.mockToken.options.address)
                .send({ from: account });
            setIsTokenSupported(true);
            setLoading(false);
        } catch (error) {
            console.error("Error adding token as collateral:", error);
            setError("Failed to add token as collateral. Please try again.");
            setLoading(false);
        }
    };

    useEffect(() => {
        if (web3 && account && isInitialized) {
            fetchBalances();
            
            // Set up interval to refresh balances
            const intervalId = setInterval(fetchBalances, 30000);
            return () => clearInterval(intervalId);
        }
    }, [web3, account, isInitialized, contracts]);

    if (!isInitialized) {
        return (
            <div className="account-info card">
                <h2>Account Information</h2>
                <p className="warning-message">Please connect your wallet and initialize contracts to view account information.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="account-info card">
                <h2>Account Information</h2>
                <p>Loading account information...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="account-info card">
                <h2>Account Information</h2>
                <p className="error-message">{error}</p>
                <button className="btn primary" onClick={fetchBalances}>Retry</button>
            </div>
        );
    }

    return (
        <div className="account-info card">
            <h2>Account Information</h2>
            <div className="info-content">
                <div className="info-row">
                    <span className="info-label">Address:</span>
                    <span className="info-value">{account}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">ETH Balance:</span>
                    <span className="info-value">{parseFloat(balance).toFixed(4)} ETH</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Token Balance:</span>
                    <span className="info-value">{parseFloat(tokenBalance).toFixed(4)} MOCK</span>
                </div>
                <div className="info-row">
                    <span className="info-label">ETH Margin:</span>
                    <span className="info-value">{parseFloat(userMargin).toFixed(4)} ETH</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Token Margin:</span>
                    <span className="info-value">{parseFloat(userTokenMargin).toFixed(4)} MOCK</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Position Count:</span>
                    <span className="info-value">{positionCount}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Token Supported:</span>
                    <span className="info-value">{isTokenSupported ? 'Yes' : 'No'}</span>
                </div>
                {!isTokenSupported && (
                    <button 
                        className="btn secondary" 
                        onClick={addTokenAsCollateral}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : 'Add Token as Collateral'}
                    </button>
                )}
                <div className="info-row">
                    <span className="info-label">Network:</span>
                    <span className="info-value">Sepolia Testnet</span>
                </div>
            </div>
            <button className="btn secondary refresh-btn" onClick={fetchBalances}>
                Refresh Balances
            </button>
        </div>
    );
};

export default AccountInfo;