import requests
from .sentiment_engine import FinBERTSentiment

sentiment_model = FinBERTSentiment()

def fetch_news_from_frontend(ticker):
    url = f"http://localhost:3000/api/news?symbol={ticker}"
    response = requests.get(url)
    data = response.json()

    # Adjust this based on your API response format
    headlines = [article["title"] for article in data.get("articles", [])]

    return headlines

def get_sentiment_score(ticker):
    headlines = fetch_news_from_frontend(ticker)
    return sentiment_model.score(headlines)
