# app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import requests
from textblob import TextBlob
from transformers import pipeline
import pandas as pd

app = FastAPI()

# Allow frontend (Next.js) to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load sentiment model (transformers)
sentiment_model = pipeline("sentiment-analysis")

@app.get("/")
def root():
    return {"message": "AI Stock Recommender Backend Running 🚀"}

# Example: Analyze a single news headline
@app.get("/analyze_news/")
def analyze_news(headline: str):
    # Sentiment with TextBlob
    tb_sentiment = TextBlob(headline).sentiment.polarity

    # Sentiment with transformers
    hf_result = sentiment_model(headline)[0]

    return {
        "headline": headline,
        "textblob_score": tb_sentiment,
        "hf_label": hf_result['label'],
        "hf_score": hf_result['score']
    }
