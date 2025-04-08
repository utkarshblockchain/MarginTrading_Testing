import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const MarketInfo = () => {
    const { contracts } = useWeb3();
    const [currentPrice, setCurrentPrice] = useState('0');
    const [priceHistory, setPriceHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPriceData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get current price
            const price = await contracts.priceFeed.methods
                .getLatestPrice()
                .call();
            setCurrentPrice(price);

            // Get price history (last 24 hours)
            const history = await contracts.priceFeed.methods
                .getPriceHistory(24)
                .call();
            setPriceHistory(history);

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (contracts) {
            fetchPriceData();
            // Update price every 5 seconds
            const interval = setInterval(fetchPriceData, 5000);
            return () => clearInterval(interval);
        }
    }, [contracts]);

    const chartData = {
        labels: Array.from({ length: priceHistory.length }, (_, i) => `${i}h ago`),
        datasets: [
            {
                label: 'ETH/USD Price',
                data: priceHistory,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: '24h Price History'
            }
        },
        scales: {
            y: {
                beginAtZero: false
            }
        }
    };

    if (loading) return <p>Loading market information...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <div className="market-info">
            <h2>Market Information</h2>
            <div className="info-card">
                <p>Current ETH/USD Price: ${currentPrice}</p>
                <p>24h Change: {((priceHistory[0] - priceHistory[priceHistory.length - 1]) / priceHistory[priceHistory.length - 1] * 100).toFixed(2)}%</p>
                <p>24h High: ${Math.max(...priceHistory).toFixed(2)}</p>
                <p>24h Low: ${Math.min(...priceHistory).toFixed(2)}</p>
            </div>
            <div className="chart-container">
                <Line data={chartData} options={chartOptions} />
            </div>
        </div>
    );
};

export default MarketInfo; 