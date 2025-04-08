import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const OpenPosition = () => {
    const { contracts, account, web3 } = useWeb3();
    const [positionSize, setPositionSize] = useState('');
    const [leverage, setLeverage] = useState('');
    const [sltp, setSltp] = useState('');
    const [positionType, setPositionType] = useState('0'); // 0 for LONG, 1 for SHORT
    const [reduceOnly, setReduceOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleOpenPosition = async () => {
        try {
            setLoading(true);
            setError(null);

            const weiPositionSize = web3.utils.toWei(positionSize, 'ether');
            const weiLeverage = web3.utils.toWei(leverage, 'ether');
            const weiSltp = web3.utils.toWei(sltp, 'ether');

            await contracts.marginTradeManager.methods.openPosition(
                weiPositionSize,
                weiLeverage,
                weiSltp,
                reduceOnly,
                positionType
            ).send({ from: account });

            // Reset form
            setPositionSize('');
            setLeverage('');
            setSltp('');
            setPositionType('0');
            setReduceOnly(false);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="open-position">
            <h2>Open Position</h2>
            <div className="input-group">
                <input
                    type="number"
                    value={positionSize}
                    onChange={(e) => setPositionSize(e.target.value)}
                    placeholder="Position Size"
                    step="0.000000000000000001"
                />
                <input
                    type="number"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    placeholder="Leverage"
                    min="1"
                    max="100"
                />
                <input
                    type="number"
                    value={sltp}
                    onChange={(e) => setSltp(e.target.value)}
                    placeholder="Stop Loss / Take Profit"
                    step="0.000000000000000001"
                />
                <select
                    value={positionType}
                    onChange={(e) => setPositionType(e.target.value)}
                >
                    <option value="0">LONG</option>
                    <option value="1">SHORT</option>
                </select>
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
                onClick={handleOpenPosition}
                disabled={loading || !positionSize || !leverage || !sltp}
            >
                Open Position
            </button>
            {error && <p className="error">{error}</p>}
            {loading && <p>Loading...</p>}
        </div>
    );
};

export default OpenPosition; 