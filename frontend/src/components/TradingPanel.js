import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const TradingPanel = () => {
    const { contracts, account } = useWeb3();
    const [amount, setAmount] = useState('');
    const [leverage, setLeverage] = useState('1');
    const [isLong, setIsLong] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleOpenPosition = async () => {
        try {
            setLoading(true);
            setError(null);

            // Convert amount to Wei
            const amountWei = window.web3.utils.toWei(amount, 'ether');

            // Approve token spending if needed
            const allowance = await contracts.mockToken.methods
                .allowance(account, contracts.marginTrading.address)
                .call();

            if (allowance < amountWei) {
                await contracts.mockToken.methods
                    .approve(contracts.marginTrading.address, amountWei)
                    .send({ from: account });
            }

            // Open position
            await contracts.marginTrading.methods
                .openPosition(amountWei, leverage, isLong)
                .send({ from: account });

            // Reset form
            setAmount('');
            setLeverage('1');
            setIsLong(true);

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClosePosition = async () => {
        try {
            setLoading(true);
            setError(null);

            await contracts.marginTrading.methods
                .closePosition()
                .send({ from: account });

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="trading-panel">
            <h2>Trading Panel</h2>
            {error && <p className="error">{error}</p>}

            <div className="form-group">
                <label>Amount (ETH):</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    disabled={loading}
                />
            </div>

            <div className="form-group">
                <label>Leverage:</label>
                <select
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    disabled={loading}
                >
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="3">3x</option>
                    <option value="5">5x</option>
                    <option value="10">10x</option>
                </select>
            </div>

            <div className="form-group">
                <label>Position Type:</label>
                <div className="position-type">
                    <button
                        className={`position-btn ${isLong ? 'active' : ''}`}
                        onClick={() => setIsLong(true)}
                        disabled={loading}
                    >
                        Long
                    </button>
                    <button
                        className={`position-btn ${!isLong ? 'active' : ''}`}
                        onClick={() => setIsLong(false)}
                        disabled={loading}
                    >
                        Short
                    </button>
                </div>
            </div>

            <div className="button-group">
                <button
                    className="open-btn"
                    onClick={handleOpenPosition}
                    disabled={loading || !amount}
                >
                    {loading ? 'Processing...' : 'Open Position'}
                </button>
                <button
                    className="close-btn"
                    onClick={handleClosePosition}
                    disabled={loading}
                >
                    Close Position
                </button>
            </div>
        </div>
    );
};

export default TradingPanel; 