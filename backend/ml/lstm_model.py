import yfinance as yf
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.optimizers import Adam

class LSTMPredictor:
    def __init__(self, sequence_length=60):
        self.sequence_length = sequence_length

    def load_data(self, ticker):
        df = yf.download(ticker, period="2y", interval="1d")
        df = df[['Close']].dropna()
        return df

    def prepare_data(self, data):
        scaler = MinMaxScaler()
        scaled = scaler.fit_transform(data)

        X, y = [], []
        for i in range(self.sequence_length, len(scaled)):
            X.append(scaled[i-self.sequence_length:i])
            y.append(scaled[i])

        return np.array(X), np.array(y), scaler

    def build_model(self):
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(self.sequence_length, 1)),
            LSTM(50),
            Dense(25),
            Dense(1)
        ])

        model.compile(optimizer=Adam(0.001), loss='mse')
        return model

    def predict_next(self, ticker):
        data = self.load_data(ticker)
        X, y, scaler = self.prepare_data(data.values)

        model = self.build_model()
        model.fit(X, y, epochs=5, batch_size=32, verbose=0)

        last_sequence = X[-1].reshape(1, self.sequence_length, 1)
        predicted_scaled = model.predict(last_sequence, verbose=0)
        predicted_price = scaler.inverse_transform(predicted_scaled)[0][0]

        last_price = data.values[-1][0]

        expected_return = (predicted_price - last_price) / last_price

        return {
            "predicted_price": float(predicted_price),
            "expected_return": float(expected_return)
        }
