type Rate = { inputPerM: number; outputPerM: number };

const RATES: Record<string, Rate> = {
  "gpt-4.1": { inputPerM: 2, outputPerM: 8 },
  "gpt-4o-mini": { inputPerM: 0.15, outputPerM: 0.6 },
  "claude-sonnet-4": { inputPerM: 3, outputPerM: 15 },
  "claude-haiku-3.5": { inputPerM: 0.8, outputPerM: 4 },
  "gemini-2.5-pro": { inputPerM: 1.25, outputPerM: 10 },
  "gemini-2.5-flash": { inputPerM: 0.15, outputPerM: 0.6 },
};

export function estimateCost(model: string | undefined, inputTokens: number, outputTokens: number): number {
  const rate = (model && RATES[model]) || { inputPerM: 1, outputPerM: 3 };
  return (inputTokens / 1_000_000) * rate.inputPerM + (outputTokens / 1_000_000) * rate.outputPerM;
}

export function fingerprintError(title: string, message: string): string {
  const normalized = `${title}\n${message}`
    .toLowerCase()
    .replace(/\b[0-9a-f]{8,}\b/g, "<id>")
    .replace(/\d+/g, "<n>")
    .slice(0, 400);
  return normalized;
}
