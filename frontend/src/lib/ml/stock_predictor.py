# Advanced ML Stock Prediction Model
# Combines news sentiment analysis with technical indicators

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix
import yfinance as yf
from textblob import TextBlob
import requests
from datetime import datetime, timedelta
import re
import warnings
warnings.filterwarnings('ignore')

class StockPredictionML:
    def __init__(self, guardian_api_key=None):
        self.guardian_api_key = guardian_api_key
        self.model = None
        self.scaler = StandardScaler()
        self.feature_columns = []
        
    def fetch_guardian_news(self, hours=24):
        """Fetch news from Guardian API (similar to your existing code)"""
        if not self.guardian_api_key:
            print("Warning: No Guardian API key provided, using dummy data")
            return self._generate_dummy_news()
            
        try:
            from_date = (datetime.now() - timedelta(hours=hours)).strftime('%Y-%m-%d')
            query = "merger OR acquisition OR deal OR agreement OR policy OR regulation OR trade OR economy OR stock OR market"
            
            url = f"https://content.guardianapis.com/search"
            params = {
                'section': 'business|world|politics',
                'q': query,
                'api-key': self.guardian_api_key,
                'order-by': 'newest',
                'from-date': from_date,
                'show-fields': 'trailText,thumbnail,byline',
                'page-size': 50
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            news_items = []
            for article in data.get('response', {}).get('results', []):
                news_items.append({
                    'title': article.get('webTitle', ''),
                    'description': article.get('fields', {}).get('trailText', ''),
                    'published_at': article.get('webPublicationDate', ''),
                    'url': article.get('webUrl', '')
                })
            
            return news_items
        except Exception as e:
            print(f"Error fetching news: {e}")
            return self._generate_dummy_news()
    
    def _generate_dummy_news(self):
        """Generate dummy news for testing"""
        dummy_news = [
            {"title": "Major tech merger announced", "description": "Positive outlook for sector", "published_at": "2024-01-01"},
            {"title": "Federal Reserve raises interest rates", "description": "Market uncertainty increases", "published_at": "2024-01-01"},
            {"title": "Strong quarterly earnings reported", "description": "Companies exceed expectations", "published_at": "2024-01-01"},
        ]
        return dummy_news
    
    def analyze_news_sentiment(self, news_items):
        """Analyze sentiment of news articles"""
        sentiments = []
        keywords_impact = []
        
        # Define impact keywords
        positive_keywords = ['growth', 'profit', 'increase', 'rise', 'gain', 'success', 'strong', 'beat', 'exceed']
        negative_keywords = ['decline', 'loss', 'fall', 'drop', 'weak', 'miss', 'concern', 'risk', 'uncertainty']
        
        for item in news_items:
            text = f"{item['title']} {item['description']}"
            
            # Sentiment analysis
            blob = TextBlob(text)
            sentiment_score = blob.sentiment.polarity
            sentiments.append(sentiment_score)
            
            # Keyword impact analysis
            text_lower = text.lower()
            pos_count = sum(1 for word in positive_keywords if word in text_lower)
            neg_count = sum(1 for word in negative_keywords if word in text_lower)
            keyword_impact = pos_count - neg_count
            keywords_impact.append(keyword_impact)
        
        return {
            'avg_sentiment': np.mean(sentiments) if sentiments else 0,
            'sentiment_volatility': np.std(sentiments) if sentiments else 0,
            'positive_news_ratio': len([s for s in sentiments if s > 0.1]) / len(sentiments) if sentiments else 0,
            'negative_news_ratio': len([s for s in sentiments if s < -0.1]) / len(sentiments) if sentiments else 0,
            'avg_keyword_impact': np.mean(keywords_impact) if keywords_impact else 0,
            'news_volume': len(news_items)
        }
    
    def get_technical_indicators(self, symbol, period='3mo'):
        """Calculate technical indicators for a stock"""
        try:
            stock = yf.Ticker(symbol)
            hist = stock.history(period=period)
            
            if hist.empty:
                return {}
            
            # Calculate technical indicators
            hist['SMA_20'] = hist['Close'].rolling(window=20).mean()
            hist['SMA_50'] = hist['Close'].rolling(window=50).mean()
            hist['EMA_12'] = hist['Close'].ewm(span=12).mean()
            hist['EMA_26'] = hist['Close'].ewm(span=26).mean()
            
            # MACD
            hist['MACD'] = hist['EMA_12'] - hist['EMA_26']
            hist['MACD_Signal'] = hist['MACD'].ewm(span=9).mean()
            
            # RSI
            delta = hist['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            hist['RSI'] = 100 - (100 / (1 + rs))
            
            # Bollinger Bands
            hist['BB_Middle'] = hist['Close'].rolling(window=20).mean()
            bb_std = hist['Close'].rolling(window=20).std()
            hist['BB_Upper'] = hist['BB_Middle'] + (bb_std * 2)
            hist['BB_Lower'] = hist['BB_Middle'] - (bb_std * 2)
            
            # Volume indicators
            hist['Volume_SMA'] = hist['Volume'].rolling(window=20).mean()
            
            # Get latest values
            latest = hist.iloc[-1]
            prev = hist.iloc[-2] if len(hist) > 1 else latest
            
            # Calculate percentage changes
            price_change = ((latest['Close'] - prev['Close']) / prev['Close']) * 100
            volume_ratio = latest['Volume'] / latest['Volume_SMA'] if latest['Volume_SMA'] > 0 else 1
            
            return {
                'current_price': latest['Close'],
                'price_change_1d': price_change,
                'volume_ratio': volume_ratio,
                'rsi': latest['RSI'] if not pd.isna(latest['RSI']) else 50,
                'macd': latest['MACD'] if not pd.isna(latest['MACD']) else 0,
                'macd_signal': latest['MACD_Signal'] if not pd.isna(latest['MACD_Signal']) else 0,
                'bb_position': ((latest['Close'] - latest['BB_Lower']) / (latest['BB_Upper'] - latest['BB_Lower'])) if not pd.isna(latest['BB_Lower']) else 0.5,
                'sma_20_ratio': latest['Close'] / latest['SMA_20'] if not pd.isna(latest['SMA_20']) else 1,
                'sma_50_ratio': latest['Close'] / latest['SMA_50'] if not pd.isna(latest['SMA_50']) else 1,
                'volatility': hist['Close'].pct_change().std() * np.sqrt(252) * 100  # Annualized volatility
            }
        except Exception as e:
            print(f"Error fetching technical data for {symbol}: {e}")
            return {}
    
    def create_training_data(self, symbols, days_back=30):
        """Create training dataset with historical data"""
        training_data = []
        
        for symbol in symbols:
            print(f"Processing {symbol}...")
            
            try:
                # Get historical data
                stock = yf.Ticker(symbol)
                hist = stock.history(period='1y')
                
                if len(hist) < 50:  # Need sufficient data
                    continue
                
                for i in range(50, len(hist) - 5):  # Leave buffer for future returns
                    current_date = hist.index[i]
                    
                    # Calculate technical indicators for current point
                    window_data = hist.iloc[i-20:i+1]  # 20-day window
                    
                    features = {}
                    
                    # Technical features
                    features['rsi'] = self._calculate_rsi(window_data['Close'])
                    features['macd'] = self._calculate_macd(window_data['Close'])
                    features['bb_position'] = self._calculate_bb_position(window_data['Close'])
                    features['price_trend'] = (window_data['Close'].iloc[-1] - window_data['Close'].iloc[0]) / window_data['Close'].iloc[0]
                    features['volume_trend'] = (window_data['Volume'].iloc[-1] - window_data['Volume'].iloc[0]) / window_data['Volume'].iloc[0]
                    features['volatility'] = window_data['Close'].pct_change().std()
                    
                    # News sentiment (simplified - in practice, you'd fetch historical news)
                    features.update(self._generate_dummy_sentiment())
                    
                    # Target: Future return (5-day forward return)
                    current_price = hist['Close'].iloc[i]
                    future_price = hist['Close'].iloc[i+5]
                    future_return = (future_price - current_price) / current_price
                    
                    # Classify into buy/hold/sell
                    if future_return > 0.02:  # >2% gain
                        target = 'BUY'
                    elif future_return < -0.02:  # >2% loss
                        target = 'SELL'
                    else:
                        target = 'HOLD'
                    
                    features['target'] = target
                    features['symbol'] = symbol
                    training_data.append(features)
                    
            except Exception as e:
                print(f"Error processing {symbol}: {e}")
                continue
        
        return pd.DataFrame(training_data)
    
    def _calculate_rsi(self, prices, period=14):
        """Calculate RSI"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1] if not pd.isna(rsi.iloc[-1]) else 50
    
    def _calculate_macd(self, prices):
        """Calculate MACD"""
        ema12 = prices.ewm(span=12).mean()
        ema26 = prices.ewm(span=26).mean()
        macd = ema12 - ema26
        return macd.iloc[-1] if not pd.isna(macd.iloc[-1]) else 0
    
    def _calculate_bb_position(self, prices, period=20):
        """Calculate Bollinger Band position"""
        sma = prices.rolling(window=period).mean()
        std = prices.rolling(window=period).std()
        upper = sma + (std * 2)
        lower = sma - (std * 2)
        position = (prices.iloc[-1] - lower.iloc[-1]) / (upper.iloc[-1] - lower.iloc[-1])
        return position if not pd.isna(position) else 0.5
    
    def _generate_dummy_sentiment(self):
        """Generate dummy sentiment data for training"""
        return {
            'avg_sentiment': np.random.normal(0, 0.3),
            'sentiment_volatility': np.random.uniform(0, 1),
            'positive_news_ratio': np.random.uniform(0, 1),
            'negative_news_ratio': np.random.uniform(0, 1),
            'avg_keyword_impact': np.random.normal(0, 2),
            'news_volume': np.random.randint(1, 20)
        }
    
    def train_model(self, symbols):
        """Train the ML model"""
        print("Creating training data...")
        df = self.create_training_data(symbols)
        
        if df.empty:
            raise ValueError("No training data available")
        
        # Prepare features
        feature_columns = ['rsi', 'macd', 'bb_position', 'price_trend', 'volume_trend', 
                          'volatility', 'avg_sentiment', 'sentiment_volatility', 
                          'positive_news_ratio', 'negative_news_ratio', 
                          'avg_keyword_impact', 'news_volume']
        
        self.feature_columns = feature_columns
        
        X = df[feature_columns].fillna(0)
        y = df['target']
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train ensemble model
        rf = RandomForestClassifier(n_estimators=100, random_state=42)
        gb = GradientBoostingClassifier(n_estimators=100, random_state=42)
        
        print("Training Random Forest...")
        rf.fit(X_train, y_train)
        
        print("Training Gradient Boosting...")
        gb.fit(X_train, y_train)
        
        # Evaluate models
        rf_score = rf.score(X_test, y_test)
        gb_score = gb.score(X_test, y_test)
        
        print(f"Random Forest Accuracy: {rf_score:.3f}")
        print(f"Gradient Boosting Accuracy: {gb_score:.3f}")
        
        # Use the better model
        if gb_score > rf_score:
            self.model = gb
            print("Selected Gradient Boosting as final model")
        else:
            self.model = rf
            print("Selected Random Forest as final model")
        
        # Print classification report
        y_pred = self.model.predict(X_test)
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred))
        
        return self.model
    
    def predict_stock(self, symbol):
        """Predict buy/hold/sell for a single stock"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        # Get technical indicators
        tech_data = self.get_technical_indicators(symbol)
        if not tech_data:
            return {"error": "Could not fetch technical data"}
        
        # Get news sentiment
        news = self.fetch_guardian_news()
        sentiment_data = self.analyze_news_sentiment(news)
        
        # Combine features
        features = {
            'rsi': tech_data.get('rsi', 50),
            'macd': tech_data.get('macd', 0),
            'bb_position': tech_data.get('bb_position', 0.5),
            'price_trend': tech_data.get('price_change_1d', 0) / 100,
            'volume_trend': (tech_data.get('volume_ratio', 1) - 1),
            'volatility': tech_data.get('volatility', 20) / 100,
            **sentiment_data
        }
        
        # Create feature vector
        X = np.array([[features[col] for col in self.feature_columns]])
        X_scaled = self.scaler.transform(X)
        
        # Make prediction
        prediction = self.model.predict(X_scaled)[0]
        probabilities = self.model.predict_proba(X_scaled)[0]
        
        # Get class names
        classes = self.model.classes_
        prob_dict = {classes[i]: probabilities[i] for i in range(len(classes))}
        
        return {
            'symbol': symbol,
            'prediction': prediction,
            'confidence': max(probabilities),
            'probabilities': prob_dict,
            'current_price': tech_data.get('current_price'),
            'technical_indicators': tech_data,
            'sentiment_analysis': sentiment_data
        }
    
    def predict_portfolio(self, symbols):
        """Predict for multiple stocks"""
        predictions = []
        for symbol in symbols:
            try:
                pred = self.predict_stock(symbol)
                predictions.append(pred)
            except Exception as e:
                print(f"Error predicting {symbol}: {e}")
        
        return predictions

# Example usage
def main():
    # Initialize the model
    predictor = StockPredictionML(guardian_api_key="your-guardian-api-key")
    
    # Training symbols (major stocks)
    training_symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX']
    
    print("Training model...")
    predictor.train_model(training_symbols)
    
    # Make predictions
    test_symbols = ['AAPL', 'GOOGL', 'TSLA']
    print("\nMaking predictions...")
    
    predictions = predictor.predict_portfolio(test_symbols)
    
    for pred in predictions:
        if 'error' not in pred:
            print(f"\n{pred['symbol']}:")
            print(f"  Prediction: {pred['prediction']} (Confidence: {pred['confidence']:.2f})")
            print(f"  Current Price: ${pred['current_price']:.2f}")
            print(f"  RSI: {pred['technical_indicators']['rsi']:.1f}")
            print(f"  News Sentiment: {pred['sentiment_analysis']['avg_sentiment']:.2f}")

if __name__ == "__main__":
    main()