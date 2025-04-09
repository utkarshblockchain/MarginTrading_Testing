import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

const DepositMargin = () => {
    const { contracts, account, web3, isInitialized, userMargin, userTokenMargin } = useWeb3();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [positionId, setPositionId] = useState(null);

    // Fetch user's current position ID
    useEffect(() => {
        const fetchPositionId = async () => {
            if (web3 && contracts.marginTradeManager && account) {
                try {
                    const count = await contracts.marginTradeManager.methods.userPositionCount(account).call();
                    console.log("User position count:", count);
                    setPositionId(count);
                } catch (error) {
                    console.error("Error fetching position ID:", error);
                }
            }
        };

        if (isInitialized) {
            fetchPositionId();
        }
    }, [web3, contracts, account, isInitialized]);

    const handleDepositETH = async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            // Check if web3 and contracts are initialized
            if (!web3 || !contracts.marginTradeManager || !account) {
                throw new Error("Web3 or contracts not initialized. Please connect your wallet.");
            }

            const weiAmount = web3.utils.toWei(amount, 'ether');
            console.log(`Depositing ${amount} ETH (${weiAmount} wei) as margin`);

            // Call the depositMargin function with ETH value
            const transaction = await contracts.marginTradeManager.methods.depositMargin()
                .send({ from: account, value: weiAmount });

            console.log("ETH deposit transaction successful:", transaction);
            setSuccessMessage(`Successfully deposited ${amount} ETH as margin`);
            setSuccess(true);
            
            // Refresh position ID after deposit
            const newCount = await contracts.marginTradeManager.methods.userPositionCount(account).call();
            setPositionId(newCount);
            
            setAmount('');
        } catch (error) {
            console.error("Error depositing ETH:", error);
            setError(error.message || "Failed to deposit ETH. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDepositToken = async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            // Check if web3 and contracts are initialized
            if (!web3 || !contracts.marginTradeManager || !contracts.mockToken || !account) {
                throw new Error("Web3 or contracts not initialized. Please connect your wallet.");
            }

            const weiAmount = web3.utils.toWei(amount, 'ether');
            console.log(`Depositing ${amount} tokens (${weiAmount} wei) as margin`);

            // First approve the token transfer
            console.log("Approving token transfer...");
            const approvalTx = await contracts.mockToken.methods.approve(
                contracts.marginTradeManager.options.address,
                weiAmount
            ).send({ from: account });
            
            console.log("Token approval successful:", approvalTx);

            // Then deposit the tokens
            console.log("Depositing tokens...");
            const depositTx = await contracts.marginTradeManager.methods.depositMarginERC20(
                contracts.mockToken.options.address,
                weiAmount
            ).send({ from: account });

            console.log("Token deposit transaction successful:", depositTx);
            setSuccessMessage(`Successfully deposited ${amount} tokens as margin`);
            setSuccess(true);
            
            // Refresh position ID after deposit
            const newCount = await contracts.marginTradeManager.methods.userPositionCount(account).call();
            setPositionId(newCount);
            
            setAmount('');
        } catch (error) {
            console.error("Error depositing tokens:", error);
            setError(error.message || "Failed to deposit tokens. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Clear success message after 5 seconds
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                setSuccess(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    return (
        <div className="deposit-margin card">
            <h2>Deposit Margin</h2>
            
            <div className="margin-info">
                <p>Current ETH Margin: {userMargin} ETH</p>
                <p>Current Token Margin: {userTokenMargin} Tokens</p>
                <p>Position ID: {positionId !== null ? positionId : 'Loading...'}</p>
                <p className="note">Note: You must deposit margin before opening a position.</p>
            </div>
            
            <div className="input-group">
                <label>Amount to Deposit</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    step="0.01"
                    min="0.01"
                />
            </div>
            
            <div className="button-group">
                <button
                    className="btn primary"
                    onClick={handleDepositETH}
                    disabled={loading || !isInitialized || !amount}
                >
                    {loading ? "Processing..." : "Deposit ETH"}
                </button>
                <button
                    className="btn secondary"
                    onClick={handleDepositToken}
                    disabled={loading || !isInitialized || !amount}
                >
                    {loading ? "Processing..." : "Deposit Token"}
                </button>
            </div>
            
            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{successMessage}</p>}
            
            {!isInitialized && (
                <p className="warning-message">Please connect your wallet to deposit margin.</p>
            )}
        </div>
    );
};

export default DepositMargin;