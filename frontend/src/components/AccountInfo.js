import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

const AccountInfo = () => {
    const { contracts, account, web3 } = useWeb3();
    const [balance, setBalance] = useState('0');
    const [tokenBalance, setTokenBalance] = useState('0');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBalances = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get ETH balance
            const ethBalance = await web3.eth.getBalance(account);
            setBalance(web3.utils.fromWei(ethBalance, 'ether'));

            // Get token balance
            const tokenBalance = await contracts.mockToken.methods
                .balanceOf(account)
                .call();
            setTokenBalance(web3.utils.fromWei(tokenBalance, 'ether'));

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (web3 && account) {
            fetchBalances();
        }
    }, [web3, account]);

    if (loading) return <p>Loading account information...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <div className="account-info">
            <h2>Account Information</h2>
            <div className="info-card">
                <p>Address: {account}</p>
                <p>ETH Balance: {balance} ETH</p>
                <p>Token Balance: {tokenBalance} MOCK</p>
                <p>Network: Sepolia Testnet</p>
            </div>
        </div>
    );
};

export default AccountInfo; 