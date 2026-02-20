import numpy as np

class MonteCarloSimulator:

    def __init__(self, simulations=5000, days=30):
        self.simulations = simulations
        self.days = days

    def simulate(self, current_price, expected_return, volatility):
        """
        Geometric Brownian Motion simulation
        """

        dt = 1 / 252  # trading year

        price_paths = np.zeros((self.simulations, self.days))
        price_paths[:, 0] = current_price

        for t in range(1, self.days):
            random_shock = np.random.normal(0, 1, self.simulations)
            price_paths[:, t] = price_paths[:, t - 1] * np.exp(
                (expected_return - 0.5 * volatility**2) * dt +
                volatility * np.sqrt(dt) * random_shock
            )

        final_prices = price_paths[:, -1]

        expected_price = np.mean(final_prices)
        worst_5_percent = np.percentile(final_prices, 5)
        best_5_percent = np.percentile(final_prices, 95)

        return {
            "expected_price_30d": float(expected_price),
            "worst_case_5pct": float(worst_5_percent),
            "best_case_95pct": float(best_5_percent)
        }
