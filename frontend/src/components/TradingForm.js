import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import '../styles/TradingForm.css';

const TradingForm = () => {
    const { web3, contracts, account, ethPrice } = useWeb3();
    const [positionSize, setPositionSize] = useState('');
    const [leverage, setLeverage] = useState('2');
    const [positionType, setPositionType] = useState('long');
    const [sltp, setSltp] = useState('0'); // Stop loss/take profit
    const [reduceOnly, setReduceOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [hasDeposit, setHasDeposit] = useState(false);
    const [userMargin, setUserMargin] = useState('0');
    const [userTokenMargin, setUserTokenMargin] = useState('0');

    // Check if user has deposited collateral
    useEffect(() => {
        const checkDeposit = async () => {
            if (!web3 || !contracts || !account || !contracts.marginTrading || !contracts.mockToken) {
                console.log("Web3, contracts, or account not initialized");
                return;
            }
            
            try {
                console.log("Checking for collateral deposits...");
                
                // Check ETH margin
                const ethMargin = await contracts.marginTrading.methods
                    .userMargin(account)
                    .call();
                
                console.log("ETH margin:", ethMargin);
                setUserMargin(web3.utils.fromWei(ethMargin, 'ether'));
                
                // Check ERC20 token margin
                const tokenMargin = await contracts.marginTrading.methods
                    .userTokenMargin(account, contracts.mockToken.options.address)
                    .call();
                
                console.log("Token margin:", tokenMargin);
                setUserTokenMargin(web3.utils.fromWei(tokenMargin, 'ether'));
                
                // If either ETH or token margin is greater than 0, user has a deposit
                const hasEthDeposit = parseFloat(web3.utils.fromWei(ethMargin, 'ether')) > 0;
                const hasTokenDeposit = parseFloat(web3.utils.fromWei(tokenMargin, 'ether')) > 0;
                
                setHasDeposit(hasEthDeposit || hasTokenDeposit);
                
                console.log("Has deposit:", hasEthDeposit || hasTokenDeposit);
            } catch (error) {
                console.error("Error checking deposit:", error);
                setHasDeposit(false);
            }
        };
        
        checkDeposit();
        
        // Set up an interval to check deposits every 10 seconds
        const interval = setInterval(checkDeposit, 10000);
        
        return () => clearInterval(interval);
    }, [web3, contracts, account]);

    const handleOpenPosition = async (e) => {
        e.preventDefault();
        if (!positionSize || !leverage) {
            setError('Please fill in all required fields');
            return;
        }

        if (!hasDeposit) {
            setError('You need to deposit collateral before opening a position');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            if (!web3 || !contracts || !contracts.marginTrading) {
                throw new Error("Web3 or contracts not initialized. Please refresh the page and try again.");
            }

            const sizeWei = web3.utils.toWei(positionSize, 'ether');
            const leverageValue = parseInt(leverage);
            const sltpValue = parseInt(sltp);
            const positionTypeValue = positionType === 'long' ? 0 : 1; // 0 for LONG, 1 for SHORT

            console.log("Opening position with params:", {
                sizeWei,
                leverageValue,
                sltpValue,
                reduceOnly,
                positionTypeValue
            });

            await contracts.marginTrading.methods
                .openPosition(
                    sizeWei,
                    leverageValue,
                    sltpValue,
                    reduceOnly,
                    positionTypeValue
                )
                .send({ from: account });

            // Reset form
            setPositionSize('');
            setSuccess(`Successfully opened a ${positionType} position with ${leverage}x leverage`);

        } catch (error) {
            console.error("Error opening position:", error);
            setError(error.message || "Failed to open position. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleClosePosition = async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            if (!web3 || !contracts || !contracts.marginTrading) {
                throw new Error("Web3 or contracts not initialized. Please refresh the page and try again.");
            }

            // Using position ID 0 for simplicity
            await contracts.marginTrading.methods
                .closePosition(0)
                .send({ from: account });

            setSuccess("Position closed successfully");

        } catch (error) {
            console.error("Error closing position:", error);
            setError(error.message || "Failed to close position. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="trading-form-container">
            <h2>Open Position</h2>
            <div className="current-price">
                <span>Current ETH Price: </span>
                <span className="price-value">${parseFloat(ethPrice).toFixed(2)}</span>
            </div>
            
            <div className="margin-info">
                <div className="margin-item">
                    <span>ETH Margin:</span>
                    <span className="margin-value">{parseFloat(userMargin).toFixed(4)} ETH</span>
                </div>
                <div className="margin-item">
                    <span>Token Margin:</span>
                    <span className="margin-value">{parseFloat(userTokenMargin).toFixed(2)} Tokens</span>
                </div>
            </div>
            
            {!hasDeposit && (
                <div className="warning-message">
                    Please deposit collateral first before opening a position
                </div>
            )}
            
            <form onSubmit={handleOpenPosition} className="trading-form">
                <div className="form-group">
                    <label htmlFor="positionSize">Position Size (ETH)</label>
                    <input
                        type="number"
                        id="positionSize"
                        value={positionSize}
                        onChange={(e) => setPositionSize(e.target.value)}
                        step="0.01"
                        min="0.01"
                        placeholder="0.1"
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="leverage">Leverage</label>
                    <select
                        id="leverage"
                        value={leverage}
                        onChange={(e) => setLeverage(e.target.value)}
                        className="form-control"
                    >
                        <option value="2">2x</option>
                        <option value="5">5x</option>
                        <option value="10">10x</option>
                        <option value="20">20x</option>
                        <option value="50">50x</option>
                        <option value="100">100x</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="positionType">Position Type</label>
                    <div className="position-type-selector">
                        <button 
                            type="button" 
                            className={`position-btn ${positionType === 'long' ? 'long active' : ''}`}
                            onClick={() => setPositionType('long')}
                        >
                            Long
                        </button>
                        <button 
                            type="button" 
                            className={`position-btn ${positionType === 'short' ? 'short active' : ''}`}
                            onClick={() => setPositionType('short')}
                        >
                            Short
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="sltp">Stop Loss/Take Profit (optional)</label>
                    <input
                        type="number"
                        id="sltp"
                        value={sltp}
                        onChange={(e) => setSltp(e.target.value)}
                        min="0"
                        className="form-control"
                    />
                </div>

                <div className="form-group checkbox-group">
                    <input
                        type="checkbox"
                        id="reduceOnly"
                        checked={reduceOnly}
                        onChange={(e) => setReduceOnly(e.target.checked)}
                    />
                    <label htmlFor="reduceOnly">Reduce Only</label>
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <button 
                    type="submit" 
                    disabled={loading || !positionSize || !hasDeposit} 
                    className="action-button open-button"
                >
                    {loading ? 'Processing...' : 'Open Position'}
                </button>
            </form>

            <div className="close-position-container">
                <h2>Close Position</h2>
                <button
                    onClick={handleClosePosition}
                    disabled={loading}
                    className="action-button close-button"
                >
                    {loading ? 'Processing...' : 'Close Position'}
                </button>
            </div>
        </div>
    );
};

export default TradingForm;