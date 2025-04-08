import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import '../styles/PositionInfo.css';

const PositionInfo = () => {
    const { web3, contracts, account, ethPrice } = useWeb3();
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPositions = async () => {
        if (!web3 || !contracts || !account) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Get user position count
            const positionCount = await contracts.marginTrading.methods
                .userPositionCount(account)
                .call();

            console.log("User position count:", positionCount);

            if (parseInt(positionCount) === 0) {
                setPositions([]);
                setLoading(false);
                return;
            }

            // Fetch all positions
            const positionPromises = [];
            for (let i = 0; i < positionCount; i++) {
                positionPromises.push(
                    contracts.marginTrading.methods.positions(account, i).call()
                );
            }

            const positionResults = await Promise.all(positionPromises);
            console.log("Position results:", positionResults);
            
            // Format position data
            const formattedPositions = positionResults.map((position, index) => {
                // Check if position has required properties
                if (!position) {
                    console.error("Invalid position data:", position);
                    return null;
                }
                
                // Determine if position is long or short (0 = long, 1 = short)
                const isLong = position.positionType === '0';
                
                // Extract other position data with fallbacks
                const size = position.size ? web3.utils.fromWei(position.size, 'ether') : '0';
                const margin = position.margin ? web3.utils.fromWei(position.margin, 'ether') : '0';
                const leverage = position.leverage || '0';
                const entryPrice = position.entryPrice ? web3.utils.fromWei(position.entryPrice, 'ether') : '0';
                const liquidationPrice = position.liquidationPrice ? web3.utils.fromWei(position.liquidationPrice, 'ether') : '0';
                
                // Calculate PnL (simplified for demo)
                const currentPrice = ethPrice;
                let pnl = 0;
                
                if (isLong) {
                    pnl = (currentPrice - entryPrice) * size * leverage;
                } else {
                    pnl = (entryPrice - currentPrice) * size * leverage;
                }
                
                return {
                    id: index,
                    type: isLong ? 'Long' : 'Short',
                    size,
                    margin,
                    leverage,
                    entryPrice,
                    liquidationPrice,
                    currentPrice,
                    pnl,
                    pnlPercent: (pnl / margin) * 100,
                    timestamp: position.timestamp ? new Date(position.timestamp * 1000).toLocaleString() : 'Unknown'
                };
            }).filter(position => position !== null);
            
            setPositions(formattedPositions);
        } catch (error) {
            console.error("Error fetching positions:", error);
            setError("Failed to load position data. Please refresh the page.");
        } finally {
            setLoading(false);
        }
    };

    // Fetch positions on component mount and when account changes
    useEffect(() => {
        fetchPositions();
        
        // Set up interval to refresh positions
        const interval = setInterval(fetchPositions, 10000);
        return () => clearInterval(interval);
    }, [web3, contracts, account, ethPrice]);

    if (loading) {
        return (
            <div className="position-info">
                <h2>Your Positions</h2>
                <div className="loading-message">Loading positions...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="position-info">
                <h2>Your Positions</h2>
                <div className="error-message">{error}</div>
            </div>
        );
    }

    return (
        <div className="position-info">
            <h2>Your Positions</h2>
            
            {positions.length === 0 ? (
                <div className="no-positions-message">
                    You don't have any open positions
                </div>
            ) : (
                <div className="positions-list">
                    {positions.map(position => (
                        <div key={position.id} className={`position-card ${position.type.toLowerCase()}`}>
                            <div className="position-header">
                                <span className={`position-type ${position.type.toLowerCase()}`}>
                                    {position.type}
                                </span>
                                <span className="position-id">ID: {position.id}</span>
                            </div>
                            
                            <div className="position-details">
                                <div className="detail-row">
                                    <span className="detail-label">Size:</span>
                                    <span className="detail-value">{parseFloat(position.size).toFixed(4)} ETH</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Margin:</span>
                                    <span className="detail-value">{parseFloat(position.margin).toFixed(4)} ETH</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Leverage:</span>
                                    <span className="detail-value">{position.leverage}x</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Entry Price:</span>
                                    <span className="detail-value">${parseFloat(position.entryPrice).toFixed(2)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Current Price:</span>
                                    <span className="detail-value">${parseFloat(position.currentPrice).toFixed(2)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Liquidation Price:</span>
                                    <span className="detail-value">${parseFloat(position.liquidationPrice).toFixed(2)}</span>
                                </div>
                                <div className="detail-row pnl">
                                    <span className="detail-label">PnL:</span>
                                    <span className={`detail-value ${position.pnl >= 0 ? 'profit' : 'loss'}`}>
                                        ${position.pnl.toFixed(2)} ({position.pnlPercent.toFixed(2)}%)
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Opened:</span>
                                    <span className="detail-value">{position.timestamp}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PositionInfo;