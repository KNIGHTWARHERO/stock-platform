import requests
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from datetime import datetime, timedelta
from ml.lstm_model import LSTMPredictor


class AdvancedStockAI:
    def __init__(self, alpha_key, finnhub_key, guardian_key):
        self.alpha_key = alpha_key
        self.finnhub_key = finnhub_key
        self.guardian_key = guardian_key
        self.lstm = LSTMPredictor()


        print("Loading FinBERT model...")
        self.tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
        self.model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
        self.model.eval()

    

    def fetch_alpha_news(self, ticker):
        url = f"https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={ticker}&apikey={self.alpha_key}"
        r = requests.get(url)
        data = r.json()
        return [item["title"] for item in data.get("feed", [])[:20]]

    def fetch_finnhub_news(self, ticker):
        url = f"https://finnhub.io/api/v1/company-news?symbol={ticker}&from={datetime.now().date()}&to={datetime.now().date()}&token={self.finnhub_key}"
        r = requests.get(url)
        data = r.json()
        return [item["headline"] for item in data[:20]]

    def fetch_guardian_news(self, ticker):
        url = f"https://content.guardianapis.com/search?q={ticker}&api-key={self.guardian_key}"
        r = requests.get(url)
        data = r.json()
        return [item["webTitle"] for item in data.get("response", {}).get("results", [])[:20]]

   

    def analyze_sentiment(self, texts):
        if not texts:
            return 0.0, 0.0

        scores = []
        confidences = []

        for text in texts:
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=256
            )

            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = torch.softmax(outputs.logits, dim=1)

                negative = probs[0][0].item()
                neutral = probs[0][1].item()
                positive = probs[0][2].item()

                sentiment_score = positive - negative
                confidence = max(positive, negative, neutral)

                scores.append(sentiment_score)
                confidences.append(confidence)

        return float(np.mean(scores)), float(np.mean(confidences))

   

    def calculate_risk_metrics(self, sentiment_score):
        predicted_return = sentiment_score * 0.05
        volatility = abs(sentiment_score) * 0.1
        var_95 = predicted_return - 1.65 * volatility

        if var_95 < -0.05:
            risk_level = "High"
        elif var_95 < -0.02:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        return predicted_return, volatility, var_95, risk_level

 

    def full_analysis(self, ticker):
        try:
            alpha_news = self.fetch_alpha_news(ticker)
            finnhub_news = self.fetch_finnhub_news(ticker)
            guardian_news = self.fetch_guardian_news(ticker)
            price_forecast = self.lstm.predict_next(ticker)


            all_news = alpha_news + finnhub_news + guardian_news

            sentiment_score, confidence = self.analyze_sentiment(all_news)

            predicted_return, volatility, var_95, risk_level = self.calculate_risk_metrics(sentiment_score)

            if sentiment_score > 0.15:
                signal = "BUY"
            elif sentiment_score < -0.15:
                signal = "SELL"
            else:
                signal = "HOLD"

            return {
                "ticker": ticker,
                "sentiment": {
                    "average_score": sentiment_score,
                    "confidence": confidence,
                    "signal": signal
                },
                "forecast": {
                    "next_day_return": price_forecast["expected_return"],
                    "predicted_price": price_forecast["predicted_price"],
                    "trend": "Uptrend" if price_forecast["expected_return"] > 0 else "Downtrend"
                },
                "risk": {
                    "var_95": var_95,
                    "risk_level": risk_level
                }
            }

        except Exception as e:
            return {"error": str(e)}
