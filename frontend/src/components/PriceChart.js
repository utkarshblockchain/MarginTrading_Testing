import React from 'react';
import '../styles/PriceChart.css';

const PriceChart = () => {
    return (
        <div className="price-chart-container">
            <div className="price-header">
                <h2>ETH/USD Price</h2>
            </div>
            
            <div className="price-chart-placeholder">
                <p>Price chart has been disabled as requested.</p>
            </div>
        </div>
    );
};

export default PriceChart;