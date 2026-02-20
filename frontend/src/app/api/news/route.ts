// app/api/news/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const apiKey = process.env.GUARDIAN_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const hours = parseInt(searchParams.get("hours") || "24", 10);

    // Date filter for freshness
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Query for impactful news
    const query =
      "merger OR acquisition OR deal OR agreement OR policy OR regulation OR trade OR economy OR stock OR market";

    // Limit to business/world/politics
    const url = `https://content.guardianapis.com/search?section=business|world|politics&q=${encodeURIComponent(
      query
    )}&api-key=${apiKey}&order-by=newest&from-date=${fromDate}&show-fields=trailText,thumbnail,byline&page-size=15`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Guardian error ${res.status}`);

    const data = await res.json();
    const mapped = (data?.response?.results ?? []).map((a: any) => ({
      title: a.webTitle,
      publishedAt: a.webPublicationDate,
      url: a.webUrl,
      description: a.fields?.trailText ?? "",
      author: a.fields?.byline ?? "",
      thumbnail: a.fields?.thumbnail ?? "",
    }));

    return NextResponse.json(mapped);
  } catch (err) {
    console.error("Guardian fetch error:", err);
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 });
  }
}
