import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const { 
        isInitialized, 
        ethMargin, 
        tokenMargin, 
        positions,
        positionCount
    } = useWeb3();

    // Calculate total position value
    const calculateTotalPositionValue = () => {
        if (!positions || positions.length === 0) return 0;
        
        return positions.reduce((total, position) => {
            if (!position.open) return total;
            return total + (parseFloat(position.positionSize) * parseFloat(position.entryPrice) / 10**18);
        }, 0);
    };

    // Calculate total PnL
    const calculateTotalPnL = () => {
        if (!positions || positions.length === 0) return 0;
        
        return positions.reduce((total, position) => {
            return total + parseFloat(position.realizedPnL) / 10**18;
        }, 0);
    };

    // Calculate total fees paid
    const calculateTotalFees = () => {
        if (!positions || positions.length === 0) return 0;
        
        return positions.reduce((total, position) => {
            return total + parseFloat(position.fees) / 10**18;
        }, 0);
    };

    // Count open positions
    const countOpenPositions = () => {
        if (!positions || positions.length === 0) return 0;
        
        return positions.filter(position => position.open).length;
    };

    return (
        <div className="dashboard">
            <h2>Trading Dashboard</h2>
            
            {!isInitialized ? (
                <div className="connect-prompt">
                    <p>Please connect your wallet to view your trading dashboard.</p>
                </div>
            ) : (
                <div className="dashboard-content">
                    <div className="dashboard-cards">
                        <div className="dashboard-card">
                            <h3>ETH Margin</h3>
                            <p className="value">{parseFloat(ethMargin).toFixed(4)} ETH</p>
                        </div>
                        
                        <div className="dashboard-card">
                            <h3>Token Margin</h3>
                            <p className="value">{parseFloat(tokenMargin).toFixed(4)} Tokens</p>
                        </div>
                        
                        <div className="dashboard-card">
                            <h3>Total Positions</h3>
                            <p className="value">{positionCount}</p>
                        </div>
                        
                        <div className="dashboard-card">
                            <h3>Open Positions</h3>
                            <p className="value">{countOpenPositions()}</p>
                        </div>
                    </div>
                    
                    <div className="dashboard-stats">
                        <div className="stat-item">
                            <span className="stat-label">Total Position Value:</span>
                            <span className="stat-value">${calculateTotalPositionValue().toFixed(2)}</span>
                        </div>
                        
                        <div className="stat-item">
                            <span className="stat-label">Total Realized PnL:</span>
                            <span className="stat-value">${calculateTotalPnL().toFixed(2)}</span>
                        </div>
                        
                        <div className="stat-item">
                            <span className="stat-label">Total Fees Paid:</span>
                            <span className="stat-value">${calculateTotalFees().toFixed(4)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
