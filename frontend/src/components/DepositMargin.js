import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';

const DepositMargin = () => {
    const { contracts, account, web3 } = useWeb3();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleDepositETH = async () => {
        try {
            setLoading(true);
            setError(null);

            const weiAmount = web3.utils.toWei(amount, 'ether');
            await contracts.marginTradeManager.methods.depositMargin()
                .send({ from: account, value: weiAmount });

            setAmount('');
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDepositToken = async () => {
        try {
            setLoading(true);
            setError(null);

            const weiAmount = web3.utils.toWei(amount, 'ether');

            // First approve the token transfer
            await contracts.mockToken.methods.approve(
                contracts.marginTradeManager._address,
                weiAmount
            ).send({ from: account });

            // Then deposit the tokens
            await contracts.marginTradeManager.methods.depositMarginERC20(
                contracts.mockToken._address,
                weiAmount
            ).send({ from: account });

            setAmount('');
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="deposit-margin">
            <h2>Deposit Margin</h2>
            <div className="input-group">
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    step="0.000000000000000001"
                />
            </div>
            <div className="button-group">
                <button
                    onClick={handleDepositETH}
                    disabled={loading || !amount}
                >
                    Deposit ETH
                </button>
                <button
                    onClick={handleDepositToken}
                    disabled={loading || !amount}
                >
                    Deposit Token
                </button>
            </div>
            {error && <p className="error">{error}</p>}
            {loading && <p>Loading...</p>}
        </div>
    );
};

export default DepositMargin; 