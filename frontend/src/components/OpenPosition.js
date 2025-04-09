import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

const OpenPosition = () => {
    const { contracts, account, web3, isInitialized, userMargin } = useWeb3();
    const [positionSize, setPositionSize] = useState('');
    const [leverage, setLeverage] = useState('');
    const [sltp, setSltp] = useState('');
    const [positionType, setPositionType] = useState('0'); // 0 for LONG, 1 for SHORT
    const [reduceOnly, setReduceOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
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

    const handleOpenPosition = async () => {
        try {
            // Reset states
            setLoading(true);
            setError(null);
            setSuccess(false);

            // Check if web3 and contracts are initialized
            if (!web3 || !contracts.marginTradeManager || !account) {
                throw new Error("Web3 or contracts not initialized. Please connect your wallet.");
            }

            // Check if user has deposited margin
            if (parseFloat(userMargin) <= 0) {
                throw new Error("You need to deposit margin before opening a position.");
            }

            // Convert position size to wei (this is a monetary value)
            const weiPositionSize = web3.utils.toWei(positionSize, 'ether');
            
            // Leverage is a simple number (1-100), not wei
            const leverageValue = parseInt(leverage);
            
            // Convert sltp to wei (this is a price value)
            const weiSltp = web3.utils.toWei(sltp, 'ether');

            console.log("Opening position with parameters:", {
                positionSize: weiPositionSize,
                leverage: leverageValue,
                sltp: weiSltp,
                reduceOnly,
                positionType
            });

            // Call the contract method
            const transaction = await contracts.marginTradeManager.methods.openPosition(
                weiPositionSize,
                leverageValue,
                weiSltp,
                reduceOnly,
                positionType
            ).send({ from: account });

            console.log("Transaction successful:", transaction);
            setSuccess(true);

            // Refresh position ID after opening a position
            const newCount = await contracts.marginTradeManager.methods.userPositionCount(account).call();
            setPositionId(newCount);

            // Reset form on success
            setPositionSize('');
            setLeverage('');
            setSltp('');
            setPositionType('0');
            setReduceOnly(false);
        } catch (error) {
            console.error("Error opening position:", error);
            setError(error.message || "Failed to open position. Please try again.");
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
        <div className="open-position card">
            <h2>Open Position</h2>
            
            {userMargin && (
                <div className="margin-info">
                    <p>Available Margin: {userMargin} ETH</p>
                    <p>Current Position ID: {positionId !== null ? positionId : 'Loading...'}</p>
                </div>
            )}
            
            <div className="input-group">
                <label>Position Size (ETH)</label>
                <input
                    type="number"
                    value={positionSize}
                    onChange={(e) => setPositionSize(e.target.value)}
                    placeholder="Position Size"
                    step="0.01"
                    min="0.01"
                />
            </div>
            
            <div className="input-group">
                <label>Leverage (1-100x)</label>
                <input
                    type="number"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    placeholder="Leverage"
                    min="1"
                    max="100"
                    step="1"
                />
            </div>
            
            <div className="input-group">
                <label>Stop Loss / Take Profit (ETH)</label>
                <input
                    type="number"
                    value={sltp}
                    onChange={(e) => setSltp(e.target.value)}
                    placeholder="Stop Loss / Take Profit"
                    step="0.01"
                />
            </div>
            
            <div className="input-group">
                <label>Position Type</label>
                <select
                    value={positionType}
                    onChange={(e) => setPositionType(e.target.value)}
                >
                    <option value="0">LONG</option>
                    <option value="1">SHORT</option>
                </select>
            </div>
            
            <div className="input-group checkbox">
                <label>
                    <input
                        type="checkbox"
                        checked={reduceOnly}
                        onChange={(e) => setReduceOnly(e.target.checked)}
                    />
                    Reduce Only
                </label>
            </div>
            
            <button
                className="btn primary"
                onClick={handleOpenPosition}
                disabled={loading || !isInitialized || !positionSize || !leverage || !sltp || parseFloat(userMargin) <= 0}
            >
                {loading ? "Processing..." : "Open Position"}
            </button>
            
            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">Position opened successfully!</p>}
            
            {!isInitialized && (
                <p className="warning-message">Please connect your wallet to open positions.</p>
            )}
            
            {parseFloat(userMargin) <= 0 && isInitialized && (
                <p className="warning-message">You need to deposit margin before opening a position.</p>
            )}
        </div>
    );
};

export default OpenPosition;