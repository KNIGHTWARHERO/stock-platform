#!/usr/bin/env python3
import sys
import json
from stock_predictor import StockPredictionML

def main():
    # Accept comma separated symbol list
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Symbols required"}))
        return

    symbols = sys.argv[1].split(",")

    try:
        predictor = StockPredictionML()
        predictor.train_model(symbols)  # make sure function name matches your class
        print(json.dumps({"success": True, "message": "Model trained successfully"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
