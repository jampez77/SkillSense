const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at", "by", "for", "with",
  "about", "against", "between", "into", "through", "during", "before", "after", "above", "below",
  "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further",
  "once", "here", "there", "all", "any", "both", "each", "few", "more", "most", "other", "some",
  "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can",
  "will", "just", "don", "should", "now", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having", "do", "does", "did", "doing", "of", "this", "that", "these",
  "those", "i", "you", "he", "she", "it", "we", "they", "them", "his", "her", "its", "our",
  "their", "as", "use", "using", "used",
]);

export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[`*_#>[\](){}]/g, " ")
    .split(/[^a-z0-9+.#-]+/i)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function uniqueTokens(text: string): Set<string> {
  return new Set(tokenize(text));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Frequency-based keyword extraction, weighting heading text 3x body text. */
export function extractKeywords(headings: string[], body: string, max = 12): string[] {
  const freq = new Map<string, number>();
  const add = (tokens: string[], weight: number) => {
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + weight);
    }
  };
  add(tokenize(headings.join(" ")), 3);
  add(tokenize(body), 1);

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([token]) => token);
}
