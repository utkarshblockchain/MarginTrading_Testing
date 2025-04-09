import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import '../styles/TradePositions.css';

const TradePositions = () => {
    const { web3, contracts, account, isInitialized, positions, fetchUserPositions } = useWeb3();
    
    // State for opening a new position
    const [positionSize, setPositionSize] = useState('');
    const [leverage, setLeverage] = useState('1');
    const [sltp, setSltp] = useState('0');
    const [reduceOnly, setReduceOnly] = useState(false);
    const [positionType, setPositionType] = useState('0'); // 0 = LONG, 1 = SHORT
    
    // State for UI
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [activeTab, setActiveTab] = useState('open'); // 'open' or 'positions'

    // Handle opening a new position
    const handleOpenPosition = async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            // Check if web3 and contracts are initialized
            if (!web3 || !contracts.marginTradeManager || !account) {
                throw new Error("Web3 or contracts not initialized. Please connect your wallet.");
            }

            // Validate inputs
            if (!positionSize || parseFloat(positionSize) <= 0) {
                throw new Error("Position size must be greater than 0");
            }

            if (!leverage || parseInt(leverage) <= 0 || parseInt(leverage) > 100) {
                throw new Error("Leverage must be between 1 and 100");
            }

            // Check if user has deposited margin
            const positionCount = await contracts.marginTradeManager.methods.userPositionCount(account).call();
            console.log("Current position count:", positionCount);
            
            if (parseInt(positionCount) === 0) {
                throw new Error("You need to deposit margin first before opening a position");
            }

            // Get the latest position to check margin
            const latestPositionId = parseInt(positionCount) - 1;
            const latestPosition = await contracts.marginTradeManager.methods.positions(account, latestPositionId).call();
            console.log("Latest position:", latestPosition);
            
            if (latestPosition.open) {
                throw new Error("You already have an open position. Please close it before opening a new one.");
            }
            
            if (web3.utils.toBN(latestPosition.margin).isZero()) {
                throw new Error("No margin available. Please deposit margin first.");
            }

            // Convert values to proper format
            const sizeWei = web3.utils.toWei(positionSize, 'ether');
            const leverageValue = parseInt(leverage);
            const sltpValue = web3.utils.toWei(sltp, 'ether');
            const positionTypeValue = parseInt(positionType);

            console.log(`Opening position: Size=${positionSize}, Leverage=${leverageValue}, SLTP=${sltp}, ReduceOnly=${reduceOnly}, Type=${positionTypeValue === 0 ? 'LONG' : 'SHORT'}`);

            // Call the openPosition function
            const transaction = await contracts.marginTradeManager.methods.openPosition(
                sizeWei,
                leverageValue,
                sltpValue,
                reduceOnly,
                positionTypeValue
            ).send({ 
                from: account,
                gas: 500000 // Set a higher gas limit to ensure transaction doesn't run out of gas
            });

            console.log("Position opened successfully:", transaction);
            setSuccessMessage(`Successfully opened a ${positionTypeValue === 0 ? 'LONG' : 'SHORT'} position with ${positionSize} size and ${leverageValue}x leverage`);
            setSuccess(true);
            
            // Add a delay before refreshing to ensure blockchain has updated
            setTimeout(() => {
                fetchUserPositions();
                console.log("Refreshing user positions after opening position");
            }, 2000);
            
            // Reset form
            setPositionSize('');
            setLeverage('1');
            setSltp('0');
            setReduceOnly(false);
            setPositionType('0');
            
            // Switch to positions tab
            setActiveTab('positions');
        } catch (error) {
            console.error("Error opening position:", error);
            
            // Extract the revert reason if available
            let errorMessage = "Failed to open position. Please try again.";
            
            if (error.message.includes("revert")) {
                errorMessage = "Transaction reverted by the contract. Possible reasons: insufficient margin, invalid parameters, or position already open.";
            } else if (error.message.includes("gas")) {
                errorMessage = "Transaction failed due to gas issues. Try increasing the gas limit.";
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Handle closing a position
    const handleClosePosition = async (positionId) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            // Check if web3 and contracts are initialized
            if (!web3 || !contracts.marginTradeManager || !account) {
                throw new Error("Web3 or contracts not initialized. Please connect your wallet.");
            }

            console.log(`Closing position ID: ${positionId}`);

            // Call the closePosition function
            const transaction = await contracts.marginTradeManager.methods.closePosition(positionId)
                .send({ from: account });

            console.log("Position closed successfully:", transaction);
            setSuccessMessage(`Successfully closed position #${positionId}`);
            setSuccess(true);
            
            // Refresh user position data
            fetchUserPositions();
        } catch (error) {
            console.error("Error closing position:", error);
            setError(error.message || "Failed to close position. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Handle withdrawing margin
    const handleWithdrawMargin = async (positionId) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            // Check if web3 and contracts are initialized
            if (!web3 || !contracts.marginTradeManager || !account) {
                throw new Error("Web3 or contracts not initialized. Please connect your wallet.");
            }

            // Get position details
            const position = positions.find(p => p.id === positionId);
            if (!position) {
                throw new Error(`Position #${positionId} not found`);
            }

            // Prompt for amount to withdraw
            const amount = prompt(`Enter amount to withdraw from position #${positionId}. Available margin: ${web3.utils.fromWei(position.margin, 'ether')}`);
            if (!amount) return;

            const weiAmount = web3.utils.toWei(amount, 'ether');
            console.log(`Withdrawing ${amount} from position #${positionId}`);

            // Call the withdrawMargin function
            const transaction = await contracts.marginTradeManager.methods.withdrawMargin(
                positionId,
                weiAmount
            ).send({ from: account });

            console.log("Margin withdrawn successfully:", transaction);
            setSuccessMessage(`Successfully withdrew ${amount} from position #${positionId}`);
            setSuccess(true);
            
            // Refresh user position data
            fetchUserPositions();
        } catch (error) {
            console.error("Error withdrawing margin:", error);
            setError(error.message || "Failed to withdraw margin. Please try again.");
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
        <div className="trade-positions card">
            <div className="tabs">
                <button 
                    className={`tab-button ${activeTab === 'open' ? 'active' : ''}`}
                    onClick={() => setActiveTab('open')}
                >
                    Open Position
                </button>
                <button 
                    className={`tab-button ${activeTab === 'positions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('positions')}
                >
                    My Positions
                </button>
            </div>
            
            {activeTab === 'open' ? (
                <div className="open-position-form">
                    <h2>Open Trading Position</h2>
                    
                    <div className="input-group">
                        <label>Position Size</label>
                        <input
                            type="number"
                            value={positionSize}
                            onChange={(e) => setPositionSize(e.target.value)}
                            placeholder="Enter position size"
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
                            placeholder="Enter leverage"
                            step="1"
                            min="1"
                            max="100"
                        />
                    </div>
                    
                    <div className="input-group">
                        <label>Stop Loss/Take Profit Level</label>
                        <input
                            type="number"
                            value={sltp}
                            onChange={(e) => setSltp(e.target.value)}
                            placeholder="Enter SLTP (0 if not used)"
                            step="0.01"
                            min="0"
                        />
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
                    
                    <button
                        className="btn primary"
                        onClick={handleOpenPosition}
                        disabled={loading || !isInitialized || !positionSize || !leverage}
                    >
                        {loading ? "Processing..." : "Open Position"}
                    </button>
                </div>
            ) : (
                <div className="positions-list">
                    <h2>My Trading Positions</h2>
                    
                    {positions.length === 0 ? (
                        <p className="no-positions">You don't have any positions yet.</p>
                    ) : (
                        <div className="positions-table-container">
                            <table className="positions-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Type</th>
                                        <th>Size</th>
                                        <th>Entry Price</th>
                                        <th>Leverage</th>
                                        <th>Margin</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((position) => (
                                        <tr key={position.id} className={position.open ? 'open' : 'closed'}>
                                            <td>{position.id}</td>
                                            <td>{position.positionType === '0' ? 'LONG' : 'SHORT'}</td>
                                            <td>{web3.utils.fromWei(position.positionSize, 'ether')}</td>
                                            <td>{web3.utils.fromWei(position.entryPrice, 'ether')}</td>
                                            <td>{position.leverage}x</td>
                                            <td>{web3.utils.fromWei(position.margin, 'ether')} {position.isEth ? 'ETH' : 'Tokens'}</td>
                                            <td>{position.open ? 'Open' : 'Closed'}</td>
                                            <td>
                                                {position.open && (
                                                    <>
                                                        <button
                                                            className="btn small"
                                                            onClick={() => handleClosePosition(position.id)}
                                                            disabled={loading}
                                                        >
                                                            Close
                                                        </button>
                                                        <button
                                                            className="btn small secondary"
                                                            onClick={() => handleWithdrawMargin(position.id)}
                                                            disabled={loading}
                                                        >
                                                            Withdraw
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            
            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{successMessage}</p>}
            
            {!isInitialized && (
                <p className="warning-message">Please connect your wallet to manage positions.</p>
            )}
        </div>
    );
};

export default TradePositions;
