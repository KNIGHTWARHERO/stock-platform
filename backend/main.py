from fastapi import FastAPI
from ml.stock_ai import AdvancedStockAI


app = FastAPI()

AI = AdvancedStockAI(
    alpha_key="XUCNXEM9CN8LBQ33",
    finnhub_key="d3f7e4pr01qolknc0k3gd3f7e4pr01qolknc0k40",
    guardian_key="6f18adf5-2487-4f31-b4b5-c9e46557b5f9"
)

@app.get("/full-analysis/{ticker}")
def analyze_stock(ticker: str):
    return AI.full_analysis(ticker)
