#!/usr/bin/env python3
import sys
import json
from stock_predictor import StockPredictionML

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Symbols required"}))
        return
    
    symbols = sys.argv[1].split(",")
    api_key = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        predictor = StockPredictionML(guardian_api_key=api_key)
        results = []
        for s in symbols:
            results.append(predictor.predict_stock(s))
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
