import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = () => {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Caricamento...</p>
    </div>
  );
};

export default LoadingSpinner;
