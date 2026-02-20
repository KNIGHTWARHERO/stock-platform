// frontend/src/app/api/stocks/route.ts
import { NextResponse } from "next/server";

/**
 * VERIFIED SYMBOL → COMPANY NAME MAP
 * (Exact, official names — no knockoffs)
 */
const COMPANY_MAP: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corporation",
  GOOGL: "Alphabet Inc. (Class A)",
  AMZN: "Amazon.com, Inc.",
  TSLA: "Tesla, Inc.",
  NVDA: "NVIDIA Corporation",
  META: "Meta Platforms, Inc.",
};

const DEFAULT_SYMBOLS = Object.keys(COMPANY_MAP);
const MAX_SYMBOLS_TO_FETCH = 5; // Alpha Vantage free tier safety

function parseGlobalQuote(data: any) {
  const q = data?.["Global Quote"] ?? null;
  if (!q) return null;

  return {
    symbol: q["01. symbol"],
    price: Number(q["05. price"]),
    changePercent: Number(
      String(q["10. change percent"] ?? "0").replace("%", "")
    ),
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const symbolsParam = url.searchParams.get("symbols");

    const symbols = symbolsParam
      ? symbolsParam
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter((s) => COMPANY_MAP[s])
      : DEFAULT_SYMBOLS;

    const apiKey = process.env.ALPHA_VANTAGE;

    // Development fallback (exact names preserved)
    if (!apiKey) {
      const mock = symbols.map((symbol, i) => ({
        symbol,
        name: COMPANY_MAP[symbol],
        price: [232.14, 451.78, 172.49, 188.8, 241.74][i % 5],
        change: [+0.84, -0.07, +0.08, +0.02, -0.13][i % 5],
        note: "ALPHA_VANTAGE not set — mock data",
      }));
      return NextResponse.json({ stocks: mock });
    }

    const toFetch = symbols.slice(0, MAX_SYMBOLS_TO_FETCH);

    const results = await Promise.all(
      toFetch.map(async (symbol) => {
        try {
          const endpoint = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
          const res = await fetch(endpoint);

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();
          const quote = parseGlobalQuote(data);

          if (!quote) {
            throw new Error("No quote data");
          }

          return {
            symbol,
            name: COMPANY_MAP[symbol], // ✅ EXACT COMPANY NAME
            price: quote.price,
            change: quote.changePercent,
          };
        } catch (err) {
          return {
            symbol,
            name: COMPANY_MAP[symbol],
            price: null,
            change: null,
            error: "Failed to fetch quote",
          };
        }
      })
    );

    return NextResponse.json({
      stocks: results,
      fetched: results.length,
      source: "Alpha Vantage",
      note: `max ${MAX_SYMBOLS_TO_FETCH} symbols`,
    });
  } catch (err) {
    console.error("API /api/stocks error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
