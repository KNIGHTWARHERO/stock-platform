// app/api/stock-predictions/route.ts
import { NextResponse } from "next/server";

// Mock ML prediction service (in production, this would call your Python ML model)
class StockPredictionService {
  private static instance: StockPredictionService;
  private modelTrained: boolean = false;

  static getInstance(): StockPredictionService {
    if (!StockPredictionService.instance) {
      StockPredictionService.instance = new StockPredictionService();
    }
    return StockPredictionService.instance;
  }

  async fetchGuardianNews(hours: number = 24) {
    const apiKey = process.env.GUARDIAN_KEY;
    if (!apiKey) {
      throw new Error("Missing Guardian API key");
    }

    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const query = "merger OR acquisition OR deal OR agreement OR policy OR regulation OR trade OR economy OR stock OR market";
    const url = `https://content.guardianapis.com/search?section=business|world|politics&q=${encodeURIComponent(
      query
    )}&api-key=${apiKey}&order-by=newest&from-date=${fromDate}&show-fields=trailText,thumbnail,byline&page-size=50`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Guardian API error: ${res.status}`);

    const data = await res.json();
    return (data?.response?.results ?? []).map((article: any) => ({
      title: article.webTitle,
      description: article.fields?.trailText ?? "",
      publishedAt: article.webPublicationDate,
      url: article.webUrl,
    }));
  }

  analyzeSentiment(newsItems: any[]) {
    // Simplified sentiment analysis (in production, use TextBlob or similar)
    const sentiments = newsItems.map(item => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      
      const positiveWords = ['growth', 'profit', 'increase', 'rise', 'gain', 'success', 'strong', 'beat', 'exceed', 'up'];
      const negativeWords = ['decline', 'loss', 'fall', 'drop', 'weak', 'miss', 'concern', 'risk', 'uncertainty', 'down'];
      
      let score = 0;
      positiveWords.forEach(word => {
        if (text.includes(word)) score += 1;
      });
      negativeWords.forEach(word => {
        if (text.includes(word)) score -= 1;
      });
      
      return Math.max(-1, Math.min(1, score / 5)); // Normalize to [-1, 1]
    });

    return {
      avgSentiment: sentiments.reduce((a, b) => a + b, 0) / sentiments.length || 0,
      sentimentVolatility: this.calculateStandardDeviation(sentiments),
      positiveNewsRatio: sentiments.filter(s => s > 0.1).length / sentiments.length || 0,
      negativeNewsRatio: sentiments.filter(s => s < -0.1).length / sentiments.length || 0,
      newsVolume: newsItems.length
    };
  }

  calculateStandardDeviation(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  async getTechnicalIndicators(symbol: string) {
    try {
      // In production, you'd use a financial data API like Alpha Vantage, Yahoo Finance, etc.
      // For demo purposes, we'll simulate the data
      const mockData = this.generateMockTechnicalData(symbol);
      return mockData;
    } catch (error) {
      console.error(`Error fetching technical data for ${symbol}:`, error);
      return null;
    }
  }

  generateMockTechnicalData(symbol: string) {
    // Mock technical indicators (replace with real API calls)
    const basePrice = Math.random() * 200 + 50; // $50-$250
    return {
      currentPrice: basePrice,
      priceChange1d: (Math.random() - 0.5) * 10, // -5% to +5%
      volumeRatio: Math.random() * 2 + 0.5, // 0.5x to 2.5x average
      rsi: Math.random() * 100,
      macd: (Math.random() - 0.5) * 2,
      bbPosition: Math.random(), // 0 to 1
      sma20Ratio: Math.random() * 0.2 + 0.9, // 0.9 to 1.1
      sma50Ratio: Math.random() * 0.2 + 0.9,
      volatility: Math.random() * 50 + 10 // 10% to 60% annualized
    };
  }

  async predictStock(symbol: string) {
    try {
      // Get news sentiment
      const news = await this.fetchGuardianNews(24);
      const sentimentData = this.analyzeSentiment(news);

      // Get technical indicators
      const techData = await this.getTechnicalIndicators(symbol);
      if (!techData) {
        throw new Error(`Could not fetch technical data for ${symbol}`);
      }

      // Simple ML prediction logic (replace with actual model)
      const prediction = this.makeSimplePrediction(sentimentData, techData);

      return {
        symbol,
        prediction: prediction.action,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning,
        currentPrice: techData.currentPrice,
        technicalIndicators: {
          rsi: techData.rsi,
          macd: techData.macd,
          volatility: techData.volatility,
          priceChange1d: techData.priceChange1d
        },
        sentimentAnalysis: sentimentData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error predicting ${symbol}:`, error);
      throw error;
    }
  }

  makeSimplePrediction(sentiment: any, technical: any) {
    let score = 0;
    let reasoning = [];

    // Sentiment factors
    if (sentiment.avgSentiment > 0.2) {
      score += 2;
      reasoning.push("Positive news sentiment");
    } else if (sentiment.avgSentiment < -0.2) {
      score -= 2;
      reasoning.push("Negative news sentiment");
    }

    // Technical factors
    if (technical.rsi < 30) {
      score += 2;
      reasoning.push("RSI indicates oversold condition");
    } else if (technical.rsi > 70) {
      score -= 2;
      reasoning.push("RSI indicates overbought condition");
    }

    if (technical.macd > 0) {
      score += 1;
      reasoning.push("MACD shows bullish momentum");
    } else {
      score -= 1;
      reasoning.push("MACD shows bearish momentum");
    }

    if (technical.priceChange1d > 2) {
      score += 1;
      reasoning.push("Strong recent price momentum");
    } else if (technical.priceChange1d < -2) {
      score -= 1;
      reasoning.push("Weak recent price momentum");
    }

    // Volume confirmation
    if (technical.volumeRatio > 1.5) {
      score += Math.sign(score) * 0.5; // Amplify existing signal
      reasoning.push("High volume confirms trend");
    }

    // Determine action
    let action: 'BUY' | 'HOLD' | 'SELL';
    let confidence: number;

    if (score >= 3) {
      action = 'BUY';
      confidence = Math.min(0.9, 0.6 + (score - 3) * 0.1);
    } else if (score <= -3) {
      action = 'SELL';
      confidence = Math.min(0.9, 0.6 + Math.abs(score + 3) * 0.1);
    } else {
      action = 'HOLD';
      confidence = 0.5 + Math.abs(score) * 0.05;
    }

    return {
      action,
      confidence: Math.round(confidence * 100) / 100,
      reasoning: reasoning.slice(0, 3) // Top 3 reasons
    };
  }

  async predictPortfolio(symbols: string[]) {
    const predictions = [];
    
    for (const symbol of symbols) {
      try {
        const prediction = await this.predictStock(symbol);
        predictions.push(prediction);
      } catch (error) {
        predictions.push({
          symbol,
          error: `Failed to predict: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return predictions;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbols = searchParams.get("symbols")?.split(",") || ["AAPL", "GOOGL", "MSFT"];
    const hours = parseInt(searchParams.get("hours") || "24", 10);

    const predictor = StockPredictionService.getInstance();
    const predictions = await predictor.predictPortfolio(symbols);

    // Add summary statistics
    const summary = {
      totalSymbols: symbols.length,
      buySignals: predictions.filter(p => !p.error && p.prediction === 'BUY').length,
      sellSignals: predictions.filter(p => !p.error && p.prediction === 'SELL').length,
      holdSignals: predictions.filter(p => !p.error && p.prediction === 'HOLD').length,
      avgConfidence: predictions
        .filter(p => !p.error && p.confidence)
        .reduce((acc, p) => acc + (p.confidence || 0), 0) / 
        predictions.filter(p => !p.error && p.confidence).length || 0,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      predictions,
      summary,
      disclaimer: "This is for educational purposes only. Not financial advice. Past performance does not guarantee future results."
    });

  } catch (error) {
    console.error("Stock prediction error:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate predictions",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, action } = body;

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const predictor = StockPredictionService.getInstance();

    if (action === 'predict') {
      const prediction = await predictor.predictStock(symbol);
      return NextResponse.json(prediction);
    } else if (action === 'retrain') {
      // In production, this would retrain your ML model
      return NextResponse.json({ 
        message: "Model retraining initiated",
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });