export async function fetchGlobalNews() {
  const res = await fetch(
    `https://content.guardianapis.com/search?q=war OR economy OR inflation OR sanctions&api-key=${process.env.NEXT_PUBLIC_GUARDIAN_KEY}`
  );
  const data = await res.json();

  return data.response.results.map((n: any) => ({
    title: n.webTitle,
    url: n.webUrl,
    date: n.webPublicationDate,
    source: "Guardian",
  }));
}

export async function fetchStockNews(symbol: string) {
  const res = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=2025-01-01&to=2025-12-31&token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`
  );
  return await res.json();
}
