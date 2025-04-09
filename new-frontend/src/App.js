import React from 'react';
import { Web3Provider } from './context/Web3Context';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DepositMargin from './components/DepositMargin';
import TradePositions from './components/TradePositions';
import './styles/App.css';

function App() {
  return (
    <Web3Provider>
      <div className="app">
        <Header />
        <main className="main-content">
          <Dashboard />
          <div className="trading-section">
            <DepositMargin />
            <TradePositions />
          </div>
        </main>
        <footer className="footer">
          <p>Margin Trading DApp &copy; 2025</p>
        </footer>
      </div>
    </Web3Provider>
  );
}

export default App;
