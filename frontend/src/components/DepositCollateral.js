import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import '../styles/DepositCollateral.css';

const DepositCollateral = () => {
    const { web3, contracts, account, isInitialized } = useWeb3();
    const [amount, setAmount] = useState('');
    const [collateralType, setCollateralType] = useState('eth');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [userMargin, setUserMargin] = useState('0');
    const [userTokenMargin, setUserTokenMargin] = useState('0');
    const [tokenBalance, setTokenBalance] = useState('0');
    const [allowance, setAllowance] = useState('0');

    // Fetch user's margin balances
    useEffect(() => {
        const fetchMarginBalances = async () => {
            if (!web3 || !contracts || !account) {
                console.log("Web3, contracts, or account not initialized");
                return;
            }

            if (!contracts.marginTradeManager) {
                console.log("Contract instances not initialized", contracts);
                return;
            }

            try {
                // Try to get ETH margin
                try {
                    // First try with userMargin function
                    const ethMargin = await contracts.marginTradeManager.methods
                        .userMargin(account)
                        .call();
                    setUserMargin(web3.utils.fromWei(ethMargin, 'ether'));
                    console.log("ETH margin fetched:", web3.utils.fromWei(ethMargin, 'ether'));
                } catch (ethError) {
                    console.error("Error fetching ETH margin with userMargin:", ethError);
                    
                    // Fallback to checking the contract's balance
                    try {
                        const balance = await web3.eth.getBalance(account);
                        setUserMargin(web3.utils.fromWei(balance, 'ether'));
                        console.log("Using account ETH balance instead:", web3.utils.fromWei(balance, 'ether'));
                    } catch (balanceError) {
                        console.error("Error fetching account balance:", balanceError);
                    }
                }

                // Try to get token margin
                try {
                    // First try with userTokenMargin function
                    const tokenMargin = await contracts.marginTradeManager.methods
                        .userTokenMargin(account, contracts.mockToken.options.address)
                        .call();
                    setUserTokenMargin(web3.utils.fromWei(tokenMargin, 'ether'));
                    console.log("Token margin fetched:", web3.utils.fromWei(tokenMargin, 'ether'));
                } catch (tokenError) {
                    console.error("Error fetching token margin with userTokenMargin:", tokenError);
                    setUserTokenMargin('0');
                }

                // Fetch token balance
                try {
                    const balance = await contracts.mockToken.methods
                        .balanceOf(account)
                        .call();
                    setTokenBalance(web3.utils.fromWei(balance, 'ether'));
                    console.log("Token balance fetched:", web3.utils.fromWei(balance, 'ether'));
                } catch (balanceError) {
                    console.error("Error fetching token balance:", balanceError);
                }

                // Fetch current allowance
                try {
                    const currentAllowance = await contracts.mockToken.methods
                        .allowance(account, contracts.marginTradeManager.options.address)
                        .call();
                    setAllowance(web3.utils.fromWei(currentAllowance, 'ether'));
                    console.log("Token allowance fetched:", web3.utils.fromWei(currentAllowance, 'ether'));
                } catch (allowanceError) {
                    console.error("Error fetching token allowance:", allowanceError);
                }
            } catch (error) {
                console.error("Error fetching margin balances:", error);
            }
        };

        if (web3 && contracts && account) {
            fetchMarginBalances();
            
            // Set up an interval to fetch margin balances every 10 seconds
            const interval = setInterval(fetchMarginBalances, 10000);
            
            return () => clearInterval(interval);
        }
    }, [web3, contracts, account]);

    // Function to handle token approval
    const handleApproveToken = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (!web3 || !contracts || !account) {
            setError("Web3 connection not established. Please connect your wallet.");
            return;
        }

        if (!contracts.mockToken || !contracts.marginTradeManager) {
            setError("Contract instances not initialized. Please refresh the page.");
            return;
        }

        setApprovalLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const amountInWei = web3.utils.toWei(amount, 'ether');
            
            // Approve tokens
            await contracts.mockToken.methods
                .approve(contracts.marginTradeManager.options.address, amountInWei)
                .send({ from: account });
            
            // Update allowance
            const newAllowance = await contracts.mockToken.methods
                .allowance(account, contracts.marginTradeManager.options.address)
                .call();
            
            setAllowance(web3.utils.fromWei(newAllowance, 'ether'));
            setSuccess(`Successfully approved ${amount} tokens!`);
        } catch (error) {
            console.error("Error approving tokens:", error);
            setError(error.message || "Failed to approve tokens. Please try again.");
        } finally {
            setApprovalLoading(false);
        }
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (!web3 || !contracts || !account) {
            setError("Web3 connection not established. Please connect your wallet.");
            return;
        }

        if (!contracts.marginTradeManager) {
            setError("Contract instances not initialized. Please refresh the page.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const amountInWei = web3.utils.toWei(amount, 'ether');
            
            if (collateralType === 'eth') {
                // Deposit ETH
                await contracts.marginTradeManager.methods
                    .depositMargin()
                    .send({ from: account, value: amountInWei });
                
                setSuccess(`Successfully deposited ${amount} ETH!`);
            } else {
                // Check if allowance is sufficient
                if (parseFloat(allowance) < parseFloat(amount)) {
                    setError(`Insufficient allowance. Please approve at least ${amount} tokens first.`);
                    setLoading(false);
                    return;
                }
                
                // Deposit tokens
                await contracts.marginTradeManager.methods
                    .depositMarginERC20(contracts.mockToken.options.address, amountInWei)
                    .send({ from: account });
                
                setSuccess(`Successfully deposited ${amount} tokens!`);
            }
            
            // Refresh balances
            const ethMargin = await contracts.marginTradeManager.methods
                .userMargin(account)
                .call();
            setUserMargin(web3.utils.fromWei(ethMargin, 'ether'));
            
            const tokenMargin = await contracts.marginTradeManager.methods
                .userTokenMargin(account, contracts.mockToken.options.address)
                .call();
            setUserTokenMargin(web3.utils.fromWei(tokenMargin, 'ether'));
            
            // Reset form
            setAmount('');
        } catch (error) {
            console.error("Error depositing collateral:", error);
            setError(error.message || "Failed to deposit collateral. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (!web3 || !contracts || !account) {
            setError("Web3 connection not established. Please connect your wallet.");
            return;
        }

        if (!contracts.marginTradeManager) {
            setError("Contract instances not initialized. Please refresh the page.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const amountInWei = web3.utils.toWei(amount, 'ether');
            
            // Withdraw margin
            // Note: This assumes there's a withdrawMargin function in the contract
            // You may need to adjust this based on your actual contract implementation
            await contracts.marginTradeManager.methods
                .withdrawMargin(0, amountInWei) // Assuming position ID 0 for now
                .send({ from: account });
            
            setSuccess(`Successfully withdrew ${amount} ${collateralType === 'eth' ? 'ETH' : 'tokens'}!`);
            
            // Refresh balances
            const ethMargin = await contracts.marginTradeManager.methods
                .userMargin(account)
                .call();
            setUserMargin(web3.utils.fromWei(ethMargin, 'ether'));
            
            const tokenMargin = await contracts.marginTradeManager.methods
                .userTokenMargin(account, contracts.mockToken.options.address)
                .call();
            setUserTokenMargin(web3.utils.fromWei(tokenMargin, 'ether'));
            
            // Reset form
            setAmount('');
        } catch (error) {
            console.error("Error withdrawing collateral:", error);
            setError(error.message || "Failed to withdraw collateral. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="deposit-collateral-container">
            <h2>Deposit/Withdraw Collateral</h2>
            
            {!isInitialized && (
                <div className="warning-message">
                    Waiting for contract initialization... Please make sure you're connected to the Sepolia testnet.
                </div>
            )}
            
            <div className="balance-container">
                <div className="balance-item">
                    <span>ETH Margin:</span>
                    <span className="balance-value">{parseFloat(userMargin).toFixed(4)} ETH</span>
                </div>
                <div className="balance-item">
                    <span>Token Margin:</span>
                    <span className="balance-value">{parseFloat(userTokenMargin).toFixed(2)} Tokens</span>
                </div>
                {collateralType === 'token' && (
                    <>
                        <div className="balance-item">
                            <span>Token Balance:</span>
                            <span className="balance-value">{parseFloat(tokenBalance).toFixed(2)} Tokens</span>
                        </div>
                        <div className="balance-item">
                            <span>Token Allowance:</span>
                            <span className="balance-value">{parseFloat(allowance).toFixed(2)} Tokens</span>
                        </div>
                    </>
                )}
            </div>
            
            <form onSubmit={handleDeposit}>
                <div className="form-group">
                    <label htmlFor="amount">Amount</label>
                    <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        step="0.01"
                        min="0.01"
                        placeholder="0.1"
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="collateralType">Collateral Type</label>
                    <div className="collateral-selector">
                        <button 
                            type="button" 
                            className={`collateral-btn ${collateralType === 'eth' ? 'active' : ''}`}
                            onClick={() => setCollateralType('eth')}
                        >
                            ETH
                        </button>
                        <button 
                            type="button" 
                            className={`collateral-btn ${collateralType === 'token' ? 'active' : ''}`}
                            onClick={() => setCollateralType('token')}
                        >
                            Token
                        </button>
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <div className="button-group">
                    {collateralType === 'token' && (
                        <button 
                            type="button" 
                            onClick={handleApproveToken}
                            disabled={approvalLoading || !amount || !isInitialized} 
                            className="action-button approve-button"
                        >
                            {approvalLoading ? 'Approving...' : 'Approve Tokens'}
                        </button>
                    )}
                    <button 
                        type="submit" 
                        disabled={loading || !amount || !isInitialized || 
                                (collateralType === 'token' && parseFloat(allowance) < parseFloat(amount))} 
                        className="action-button deposit-button"
                    >
                        {loading ? 'Processing...' : 'Deposit'}
                    </button>
                    <button 
                        type="button"
                        onClick={handleWithdraw}
                        disabled={loading || !amount || !isInitialized} 
                        className="action-button withdraw-button"
                    >
                        {loading ? 'Processing...' : 'Withdraw'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DepositCollateral;
