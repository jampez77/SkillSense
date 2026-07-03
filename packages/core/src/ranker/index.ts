import type { CapabilityMatch, Confidence } from "../types.js";

const HIGH_THRESHOLD = 0.75;
const LOW_THRESHOLD = 0.6;
const CLEAR_MARGIN = 0.1;
const HARD_MAX_RECOMMENDATIONS = 5;

export interface RankOptions {
  minScore?: number;
  maxRecommendations?: number;
}

/**
 * Implements the SkillSense spec section 9 thresholding:
 *   score >= 0.75                                  -> recommend (high confidence)
 *   score >= 0.60 and clearly better than runner-up -> recommend top only (low/medium confidence)
 *   score <  0.60                                  -> nothing
 */
export function rankMatches(matches: CapabilityMatch[], options: RankOptions = {}): CapabilityMatch[] {
  const minScore = options.minScore ?? HIGH_THRESHOLD;
  const cap = Math.min(options.maxRecommendations ?? 3, HARD_MAX_RECOMMENDATIONS);

  const sorted = matches
    .filter((m) => m.capability.enabled)
    .slice()
    .sort((a, b) => b.score - a.score);

  const high = sorted.filter((m) => m.score >= minScore);
  if (high.length > 0) {
    return high.slice(0, cap).map((m) => withConfidence(m, "high"));
  }

  const top = sorted[0];
  if (!top || top.score < LOW_THRESHOLD) return [];

  const runnerUp = sorted[1];
  const margin = runnerUp ? top.score - runnerUp.score : Infinity;
  if (margin < CLEAR_MARGIN) return [];

  const confidence: Confidence = margin >= CLEAR_MARGIN * 2.5 ? "medium" : "low";
  return [withConfidence(top, confidence)];
}

function withConfidence(match: CapabilityMatch, confidence: Confidence): CapabilityMatch {
  return { ...match, confidence };
}
