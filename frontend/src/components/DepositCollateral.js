import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import '../styles/DepositCollateral.css';

const DepositCollateral = () => {
    const { web3, contracts, account, forceInitialize } = useWeb3();
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
    const [initializingContracts, setInitializingContracts] = useState(false);

    // Fetch user's margin balances
    useEffect(() => {
        const fetchMarginBalances = async () => {
            if (!web3 || !contracts || !account) {
                console.log("Web3, contracts, or account not initialized");
                return;
            }

            if (!contracts.marginTrading || !contracts.mockToken) {
                console.log("Contract instances not initialized", contracts);
                return;
            }

            try {
                // Try to get ETH margin
                try {
                    // First try with userMargin function
                    const ethMargin = await contracts.marginTrading.methods
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
                    const tokenMargin = await contracts.marginTrading.methods
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
                        .allowance(account, contracts.marginTrading.options.address)
                        .call();
                    setAllowance(web3.utils.fromWei(currentAllowance, 'ether'));
                    console.log("Token allowance fetched:", web3.utils.fromWei(currentAllowance, 'ether'));
                } catch (allowanceError) {
                    console.error("Error fetching token allowance:", allowanceError);
                }

            } catch (error) {
                console.error("Error in fetchMarginBalances:", error);
                setError("Error fetching balances. Check console for details.");
            }
        };

        if (web3 && contracts && account) {
            fetchMarginBalances();
            
            // Set up interval to refresh balances
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
            setError("Web3 connection not initialized");
            return;
        }

        if (!contracts.mockToken || !contracts.marginTrading) {
            setError("Contract instances not initialized");
            return;
        }

        try {
            setApprovalLoading(true);
            setError(null);
            setSuccess(null);

            // Use a very large approval amount to avoid needing multiple approvals
            const maxApproval = web3.utils.toWei('1000000', 'ether');
            
            console.log("Approving tokens for:", contracts.marginTrading.options.address);
            console.log("From account:", account);
            console.log("Amount:", maxApproval);

            const approvalTx = await contracts.mockToken.methods
                .approve(contracts.marginTrading.options.address, maxApproval)
                .send({ from: account });
            
            console.log("Token approval transaction:", approvalTx);
            
            // Fetch updated allowance
            const newAllowance = await contracts.mockToken.methods
                .allowance(account, contracts.marginTrading.options.address)
                .call();
            setAllowance(web3.utils.fromWei(newAllowance, 'ether'));
            
            setSuccess(`Successfully approved tokens for deposit`);
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
            setError("Web3 connection not initialized");
            return;
        }

        if (!contracts.marginTrading || (collateralType === 'token' && !contracts.mockToken)) {
            setError("Contract instances not initialized");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            if (collateralType === 'eth') {
                // Deposit ETH
                const amountWei = web3.utils.toWei(amount, 'ether');
                console.log("Depositing ETH:", amountWei);
                
                try {
                    // First try with depositMargin function
                    await contracts.marginTrading.methods
                        .depositMargin()
                        .send({ from: account, value: amountWei });
                    
                    setSuccess(`Successfully deposited ${amount} ETH as collateral`);
                } catch (depositError) {
                    console.error("Error with depositMargin:", depositError);
                    setError("Failed to deposit ETH. Check console for details.");
                }
            } else {
                // Deposit ERC20 token
                const amountWei = web3.utils.toWei(amount, 'ether');
                
                // Check token balance first
                const balance = await contracts.mockToken.methods.balanceOf(account).call();
                console.log("Token balance:", web3.utils.fromWei(balance, 'ether'), "tokens");
                
                if (parseFloat(web3.utils.fromWei(balance, 'ether')) < parseFloat(amount)) {
                    setError(`Insufficient token balance. You have ${web3.utils.fromWei(balance, 'ether')} tokens.`);
                    setLoading(false);
                    return;
                }
                
                // Check if token is already approved
                const currentAllowance = await contracts.mockToken.methods
                    .allowance(account, contracts.marginTrading.options.address)
                    .call();
                console.log("Current allowance:", web3.utils.fromWei(currentAllowance, 'ether'), "tokens");
                
                if (parseFloat(web3.utils.fromWei(currentAllowance, 'ether')) < parseFloat(amount)) {
                    setError(`Insufficient token allowance. Please approve tokens first.`);
                    setLoading(false);
                    return;
                }
                
                // Now deposit the token
                try {
                    console.log("Depositing tokens:", amountWei);
                    await contracts.marginTrading.methods
                        .depositMarginERC20(contracts.mockToken.options.address, amountWei)
                        .send({ from: account });
                    
                    setSuccess(`Successfully deposited ${amount} tokens as collateral`);
                } catch (depositError) {
                    console.error("Error depositing tokens:", depositError);
                    setError("Failed to deposit tokens. Please try again.");
                    setLoading(false);
                    return;
                }
            }

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

        if (!web3 || !contracts || !account || !contracts.marginTrading) {
            setError("Web3 connection or contracts not initialized");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            const amountWei = web3.utils.toWei(amount, 'ether');
            console.log("Withdrawing margin:", amountWei);
            
            try {
                await contracts.marginTrading.methods
                    .withdrawMargin(0, amountWei) // Using position ID 0 for simplicity
                    .send({ from: account });
                
                setSuccess(`Successfully withdrew ${amount} from collateral`);
            } catch (withdrawError) {
                console.error("Error with withdrawMargin:", withdrawError);
                setError("Failed to withdraw. Check console for details.");
            }
            
            // Reset form
            setAmount('');
        } catch (error) {
            console.error("Error withdrawing collateral:", error);
            setError(error.message || "Failed to withdraw collateral. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Handle force initialization
    const handleForceInitialize = async () => {
        setInitializingContracts(true);
        setError(null);
        
        try {
            const success = await forceInitialize();
            if (success) {
                setSuccess("Contracts initialized successfully!");
            } else {
                setError("Failed to initialize contracts. Please check console for details.");
            }
        } catch (error) {
            console.error("Error initializing contracts:", error);
            setError("Error initializing contracts: " + error.message);
        } finally {
            setInitializingContracts(false);
        }
    };

    // Check if contracts are initialized
    const contractsInitialized = web3 && contracts && contracts.marginTrading && contracts.mockToken;

    return (
        <div className="card deposit-collateral">
            <h2>Deposit/Withdraw Collateral</h2>
            
            {!contractsInitialized && (
                <div className="contract-initialization">
                    <div className="error-message">
                        Waiting for contract initialization... Please make sure you're connected to the Sepolia testnet.
                    </div>
                    <button 
                        className="action-button initialize-button"
                        onClick={handleForceInitialize}
                        disabled={initializingContracts}
                    >
                        {initializingContracts ? 'Initializing...' : 'Force Initialize Contracts'}
                    </button>
                </div>
            )}
            
            <div className="balance-info">
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
                            disabled={approvalLoading || !amount || !contractsInitialized} 
                            className="action-button approve-button"
                        >
                            {approvalLoading ? 'Approving...' : 'Approve Tokens'}
                        </button>
                    )}
                    <button 
                        type="submit" 
                        disabled={loading || !amount || !contractsInitialized || 
                                (collateralType === 'token' && parseFloat(allowance) < parseFloat(amount))} 
                        className="action-button deposit-button"
                    >
                        {loading ? 'Processing...' : 'Deposit'}
                    </button>
                    <button 
                        type="button"
                        onClick={handleWithdraw}
                        disabled={loading || !amount || !contractsInitialized} 
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
