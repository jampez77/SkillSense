import { tokenize } from "./tokenize.js";

interface Document {
  id: string;
  text: string;
}

const K1 = 1.5;
const B = 0.75;

/**
 * Minimal in-memory BM25 scorer over a small corpus (a few thousand docs at most,
 * well within the MVP performance budget — see brief section 22).
 */
export class Bm25Index {
  private docTokens = new Map<string, string[]>();
  private docFreq = new Map<string, number>();
  private avgDocLength = 0;
  private docCount = 0;

  constructor(documents: Document[]) {
    this.docCount = documents.length;
    let totalLength = 0;

    for (const doc of documents) {
      const tokens = tokenize(doc.text);
      this.docTokens.set(doc.id, tokens);
      totalLength += tokens.length;

      const uniqueTerms = new Set(tokens);
      for (const term of uniqueTerms) {
        this.docFreq.set(term, (this.docFreq.get(term) ?? 0) + 1);
      }
    }

    this.avgDocLength = this.docCount > 0 ? totalLength / this.docCount : 0;
  }

  private idf(term: string): number {
    const df = this.docFreq.get(term) ?? 0;
    return Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5));
  }

  /** Returns a raw BM25 score (unbounded, typically 0-10ish) for a given doc against query tokens. */
  score(docId: string, queryTokens: string[]): number {
    const tokens = this.docTokens.get(docId);
    if (!tokens || tokens.length === 0 || queryTokens.length === 0) return 0;

    const termFreq = new Map<string, number>();
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
    }

    let score = 0;
    for (const term of queryTokens) {
      const freq = termFreq.get(term);
      if (!freq) continue;
      const idf = this.idf(term);
      const numerator = freq * (K1 + 1);
      const denominator = freq + K1 * (1 - B + B * (tokens.length / (this.avgDocLength || 1)));
      score += idf * (numerator / denominator);
    }
    return score;
  }
}
