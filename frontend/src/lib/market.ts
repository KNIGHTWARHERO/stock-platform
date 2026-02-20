export async function fetchPriceHistory(symbol: string) {
  const res = await fetch(
    `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE}`
  );
  const data = await res.json();
  const series = data["Time Series (Daily)"];

  return Object.keys(series).slice(0, 30).map(d => ({
    date: d,
    close: parseFloat(series[d]["4. close"]),
  }));
}
