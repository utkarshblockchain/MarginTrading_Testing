import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import '../styles/DepositMargin.css';

const DepositMargin = () => {
    const { web3, contracts, account, isInitialized, ethMargin, tokenMargin, fetchUserPositions } = useWeb3();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

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
            
            // Add a small delay before refreshing user position data
            setTimeout(() => {
                fetchUserPositions();
                console.log("Refreshing user positions after ETH deposit");
            }, 2000);
            
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

            // Check if the token is supported
            try {
                const isSupported = await contracts.marginTradeManager.methods.supportedCollateralTokens(
                    contracts.mockToken.options.address
                ).call();
                
                if (!isSupported) {
                    throw new Error("This token is not supported for margin deposits. Please contact the administrator.");
                }
            } catch (error) {
                console.error("Error checking if token is supported:", error);
                throw new Error("Failed to verify token support. Please try again later.");
            }

            // Check token balance
            try {
                const balance = await contracts.mockToken.methods.balanceOf(account).call();
                const balanceInEther = web3.utils.fromWei(balance, 'ether');
                console.log(`Token balance: ${balanceInEther} tokens`);
                
                if (web3.utils.toBN(balance).lt(web3.utils.toBN(weiAmount))) {
                    throw new Error(`Insufficient token balance. You have ${balanceInEther} tokens, but trying to deposit ${amount} tokens.`);
                }
            } catch (error) {
                if (error.message.includes("Insufficient")) {
                    throw error;
                }
                console.error("Error checking token balance:", error);
                throw new Error("Failed to check token balance. Please try again later.");
            }

            // First approve the token transfer
            console.log("Approving token transfer...");
            try {
                const approvalTx = await contracts.mockToken.methods.approve(
                    contracts.marginTradeManager.options.address,
                    weiAmount
                ).send({ from: account });
                
                console.log("Token approval successful:", approvalTx);
            } catch (error) {
                console.error("Error approving token transfer:", error);
                throw new Error("Failed to approve token transfer. Please try again.");
            }

            // Then deposit the tokens
            console.log("Depositing tokens...");
            try {
                const depositTx = await contracts.marginTradeManager.methods.depositMarginERC20(
                    contracts.mockToken.options.address,
                    weiAmount
                ).send({ from: account });

                console.log("Token deposit transaction successful:", depositTx);
                setSuccessMessage(`Successfully deposited ${amount} tokens as margin`);
                setSuccess(true);
                
                // Add a small delay before refreshing user position data
                setTimeout(() => {
                    fetchUserPositions();
                    console.log("Refreshing user positions after token deposit");
                }, 2000);
                
                setAmount('');
            } catch (error) {
                console.error("Error depositing tokens:", error);
                throw new Error("Failed to deposit tokens. The transaction was rejected by the contract.");
            }
        } catch (error) {
            console.error("Error in deposit token process:", error);
            setError(error.message || "Failed to deposit tokens. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Clear success message after 5 seconds
    React.useEffect(() => {
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
                <p>Current ETH Margin: {ethMargin} ETH</p>
                <p>Current Token Margin: {tokenMargin} Tokens</p>
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
