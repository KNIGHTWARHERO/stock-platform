import requests
import torch
import numpy as np
import math
from datetime import datetime
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from ml.lstm_model import LSTMPredictor
from ml.monte_carlo import MonteCarloSimulator


class AdvancedStockAI:

    def __init__(self, alpha_key, finnhub_key, guardian_key):

        self.alpha_key = alpha_key
        self.finnhub_key = finnhub_key
        self.guardian_key = guardian_key

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        print("Loading FinBERT...")
        self.tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
        self.model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
        self.model.to(self.device)
        self.model.eval()

        self.lstm = LSTMPredictor()
        self.mc = MonteCarloSimulator(simulations=5000, days=30)

        self.source_weights = {
            "Reuters": 1.3,
            "Bloomberg": 1.3,
            "Financial Times": 1.25,
            "The Guardian": 1.1,
            "Alpha Vantage": 1.0,
            "Finnhub": 1.0
        }

    # =============================
    # NEWS FETCHERS
    # =============================

    def fetch_alpha_news(self, ticker):
        url = f"https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={ticker}&apikey={self.alpha_key}"
        r = requests.get(url)
        data = r.json()

        articles = []
        for item in data.get("feed", [])[:15]:
            articles.append({
                "title": item.get("title", ""),
                "description": item.get("summary", ""),
                "source": item.get("source", "Alpha Vantage"),
                "publishedAt": item.get("time_published", "")
            })
        return articles

    def fetch_finnhub_news(self, ticker):
        today = datetime.now().date()
        url = f"https://finnhub.io/api/v1/company-news?symbol={ticker}&from={today}&to={today}&token={self.finnhub_key}"
        r = requests.get(url)
        data = r.json()

        articles = []
        for item in data[:15]:
            articles.append({
                "title": item.get("headline", ""),
                "description": item.get("summary", ""),
                "source": "Finnhub",
                "publishedAt": item.get("datetime", "")
            })
        return articles

    def fetch_guardian_news(self, ticker):
        url = f"https://content.guardianapis.com/search?q={ticker}&api-key={self.guardian_key}"
        r = requests.get(url)
        data = r.json()

        articles = []
        for item in data.get("response", {}).get("results", [])[:15]:
            articles.append({
                "title": item.get("webTitle", ""),
                "description": "",
                "source": "The Guardian",
                "publishedAt": item.get("webPublicationDate", "")
            })
        return articles

    # =============================
    # SENTIMENT MODEL
    # =============================

    def finbert_score(self, text):
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=256
        ).to(self.device)

        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1)

            negative = probs[0][0].item()
            positive = probs[0][2].item()

            return positive - negative

    def recency_weight(self, published_date):
        try:
            if not published_date:
                return 1.0

            published = datetime.fromisoformat(str(published_date).replace("Z", ""))
            hours_old = (datetime.utcnow() - published).total_seconds() / 3600
            return math.exp(-hours_old / 48)
        except:
            return 1.0

    def attention_proxy(self, text):
        length_weight = min(len(text) / 500, 1.2)
        keyword_boost = 1.2 if any(word in text.lower() for word in
            ["earnings", "forecast", "merger", "acquisition", "federal reserve"]
        ) else 1.0
        return length_weight * keyword_boost

    def analyze_articles(self, articles):

        weighted_scores = []

        for article in articles:
            text = article.get("title", "") + " " + article.get("description", "")
            source = article.get("source", "Unknown")
            date = article.get("publishedAt", "")

            sentiment = self.finbert_score(text)

            recency = self.recency_weight(date)
            source_weight = self.source_weights.get(source, 1.0)
            attention = self.attention_proxy(text)

            final_weight = recency * source_weight * attention
            weighted_scores.append(sentiment * final_weight)

        if not weighted_scores:
            return 0.0

        return float(np.mean(weighted_scores))

    # =============================
    # RISK MODEL
    # =============================

    def calculate_risk(self, expected_return):
        volatility = abs(expected_return) * 1.5
        var_95 = expected_return - 1.65 * volatility

        if var_95 < -0.05:
            risk = "High"
        elif var_95 < -0.02:
            risk = "Moderate"
        else:
            risk = "Low"

        return volatility, var_95, risk

    # =============================
    # FULL PIPELINE
    # =============================

    def full_analysis(self, ticker):

        # 1️⃣ Fetch news
        alpha = self.fetch_alpha_news(ticker)
        finnhub = self.fetch_finnhub_news(ticker)
        guardian = self.fetch_guardian_news(ticker)
        all_articles = alpha + finnhub + guardian

        # 2️⃣ Sentiment score
        sentiment_score = self.analyze_articles(all_articles)

        # 3️⃣ LSTM price forecast
        price_forecast = self.lstm.predict_next(ticker)
        expected_return = price_forecast["expected_return"]
        current_price = price_forecast["predicted_price"]

        # 4️⃣ Risk metrics
        volatility, var_95, risk_level = self.calculate_risk(expected_return)

        # 5️⃣ Monte Carlo simulation (30-day distribution)
        mc_results = self.mc.simulate(
            current_price=current_price,
            expected_return=expected_return,
            volatility=volatility
        )

        # 6️⃣ Trading signal
        if expected_return > 0.03:
            signal = "BUY"
        elif expected_return < -0.03:
            signal = "SELL"
        else:
            signal = "HOLD"

        return {
            "ticker": ticker,
            "sentiment_score": sentiment_score,
            "forecast": price_forecast,
            "risk": {
                "volatility": volatility,
                "var_95": var_95,
                "level": risk_level
            },
            "monte_carlo": mc_results,
            "signal": signal
        }
