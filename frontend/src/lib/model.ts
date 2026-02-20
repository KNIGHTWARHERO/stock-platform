type ModelInput = {
  newsText: string;
  prices: number[];
};

export function softmax(arr: number[]) {
  const exps = arr.map(Math.exp);
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}

/**
 * SIMULATED NEURAL NETWORK
 * (Replace embeddings with OpenAI / local model later)
 */
export function predictMarketImpact(input: ModelInput) {
  // Fake embedding vector (768-dim normally)
  const sentimentScore =
    input.newsText.includes("war") ? -0.8 :
    input.newsText.includes("sanction") ? -0.6 :
    input.newsText.includes("rate cut") ? 0.7 :
    Math.random() * 0.2 - 0.1;

  const priceTrend =
    (input.prices[input.prices.length - 1] -
      input.prices[0]) / input.prices[0];

  // Neural fusion
  const combined = sentimentScore * 0.7 + priceTrend * 0.3;

  const probs = softmax([
    -combined,        // bearish
    Math.abs(combined) * 0.2, // neutral
    combined          // bullish
  ]);

  const labels = ["Bearish", "Neutral", "Bullish"];
  const maxIdx = probs.indexOf(Math.max(...probs));

  return {
    direction: labels[maxIdx],
    confidence: probs[maxIdx],
    sentiment: sentimentScore,
    horizon: "1–3 days",
  };
}
