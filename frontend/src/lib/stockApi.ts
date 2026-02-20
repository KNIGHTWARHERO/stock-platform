import yahooFinance from "yahoo-finance2";

export async function getStockQuote(symbol: string) {
  try {
    const result = await yahooFinance.quote(symbol);
    return {
      symbol: result.symbol,
      price: result.regularMarketPrice,
      change: result.regularMarketChangePercent,
    };
  } catch (err) {
    console.error("Error fetching stock:", err);
    return null;
  }
}
