import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

const Positions = () => {
    const { contracts, account, web3 } = useWeb3();
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPositions = async () => {
        try {
            setLoading(true);
            setError(null);

            const positionIds = await contracts.marginTradeManager.methods
                .userPositionIds(account)
                .call();

            const positionsData = await Promise.all(
                positionIds.map(async (id) => {
                    const position = await contracts.marginTradeManager.methods
                        .positions(account, id)
                        .call();

                    return {
                        id,
                        ...position,
                        margin: web3.utils.fromWei(position.margin, 'ether'),
                        positionSize: web3.utils.fromWei(position.positionSize, 'ether'),
                        entryPrice: web3.utils.fromWei(position.entryPrice, 'ether'),
                        leverage: web3.utils.fromWei(position.leverage, 'ether'),
                        sltp: web3.utils.fromWei(position.sltp, 'ether'),
                        realizedPnL: web3.utils.fromWei(position.realizedPnL, 'ether'),
                        fees: web3.utils.fromWei(position.fees, 'ether'),
                        positionType: position.positionType === '0' ? 'LONG' : 'SHORT'
                    };
                })
            );

            setPositions(positionsData);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (contracts && account) {
            fetchPositions();
        }
    }, [contracts, account]);

    const handleClosePosition = async (positionId) => {
        try {
            setLoading(true);
            setError(null);

            await contracts.marginTradeManager.methods
                .closePosition(positionId)
                .send({ from: account });

            // Refresh positions after closing
            fetchPositions();
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p>Loading positions...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <div className="positions">
            <h2>Your Positions</h2>
            {positions.length === 0 ? (
                <p>No open positions</p>
            ) : (
                <div className="positions-grid">
                    {positions.map((position) => (
                        <div key={position.id} className="position-card">
                            <h3>Position #{position.id}</h3>
                            <div className="position-details">
                                <p>Type: {position.positionType}</p>
                                <p>Size: {position.positionSize} ETH</p>
                                <p>Leverage: {position.leverage}x</p>
                                <p>Entry Price: {position.entryPrice} ETH</p>
                                <p>Stop Loss / Take Profit: {position.sltp} ETH</p>
                                <p>Margin: {position.margin} ETH</p>
                                <p>Realized PnL: {position.realizedPnL} ETH</p>
                                <p>Fees: {position.fees} ETH</p>
                                <p>Status: {position.open ? 'Open' : 'Closed'}</p>
                            </div>
                            {position.open && (
                                <button
                                    onClick={() => handleClosePosition(position.id)}
                                    className="close-button"
                                >
                                    Close Position
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Positions; 