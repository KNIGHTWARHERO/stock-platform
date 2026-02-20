'use client';

import { useState } from 'react';

export default function StockPredictor() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stock-predictions?symbols=AAPL,GOOGL,MSFT');
      const data = await response.json();
      setPredictions(data.predictions);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <button 
        onClick={fetchPredictions}
        className="bg-blue-500 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Get Predictions'}
      </button>
      
      {predictions.map((pred: any) => (
        <div key={pred.symbol} className="mt-4 p-4 border rounded">
          <h3>{pred.symbol}</h3>
          <p>Prediction: {pred.prediction}</p>
          <p>Confidence: {(pred.confidence * 100).toFixed(1)}%</p>
        </div>
      ))}
    </div>
  );
}