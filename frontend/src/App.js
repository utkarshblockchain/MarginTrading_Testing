import React from 'react';
import { Web3Provider } from './context/Web3Context';
import Header from './components/Header';
import TradingForm from './components/TradingForm';
import DepositCollateral from './components/DepositCollateral';
import PositionInfo from './components/PositionInfo';
import './styles/App.css';

function App() {
  return (
    <Web3Provider>
      <div className="app">
        <Header />
        <main className="app-content">
          <div className="trading-section">
            <div className="left-panel">
              <DepositCollateral />
              <TradingForm />
            </div>
            <div className="right-panel">
              <PositionInfo />
            </div>
          </div>
        </main>
      </div>
    </Web3Provider>
  );
}

export default App;