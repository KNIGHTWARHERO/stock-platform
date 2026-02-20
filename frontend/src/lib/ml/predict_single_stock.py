#!/usr/bin/env python3
import sys
import json
from stock_predictor import StockPredictionML

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Symbol required"}))
        return
    
    symbol = sys.argv[1]
    api_key = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        predictor = StockPredictionML(guardian_api_key=api_key)
        # Note: In production, load a pre-trained model
        result = predictor.predict_stock(symbol)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()