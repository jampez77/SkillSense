import Fuse from "fuse.js";
import type { Capability, CapabilityMatch } from "../types.js";
import { tokenize, jaccard } from "./tokenize.js";
import { Bm25Index } from "./bm25.js";

// Weights per SkillSense spec section 9. Sum = 125; the *applicable* subset of these (see
// applicableWeightSum below) is what each score is actually normalized against.
const WEIGHTS = {
  exactNameMatch: 40,
  tagOverlap: 15,
  keywordOverlap: 10,
  descriptionBM25: 20,
  examplePromptSimilarity: 20,
  sourceBoost: 5,
  pinnedBoost: 10,
  recentlyAcceptedBoost: 5,
};

// "pull-request" (a hyphenated tag) should match a prompt that writes "pull request" with a
// space — normalize both sides so hyphen/underscore/space variants are treated as equivalent.
function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function matchedItems(items: string[], promptNormalized: string): string[] {
  return items.filter(
    (item) => item.length > 1 && promptNormalized.includes(normalizeForMatch(item)),
  );
}

/** Softens the coverage-ratio penalty: matching most of a short tag/keyword list should count as
 * strong evidence, not be scaled down linearly to a middling fraction. */
function softenRatio(ratio: number): number {
  return Math.sqrt(ratio);
}

function nameMatchScore(name: string, promptLower: string, useFuzzy: boolean): number {
  const nameLower = name.toLowerCase();
  if (promptLower.includes(nameLower)) return 1;

  // Split kebab/snake_case names into words ("flutter-performance-review" -> flutter, performance,
  // review) — tokenize() alone keeps hyphens joined, which is right for multi-word tags but wrong
  // here since a prompt rarely repeats a skill's full hyphenated name verbatim.
  const nameWords = tokenize(name.replace(/[-_]+/g, " "));
  if (nameWords.length > 0) {
    const hits = nameWords.filter((w) => promptLower.includes(w)).length;
    const wordRatio = hits / nameWords.length;
    if (wordRatio > 0) return wordRatio;
  }

  if (!useFuzzy) return 0;
  const fuse = new Fuse([name], { includeScore: true, threshold: 0.6 });
  const result = fuse.search(promptLower)[0];
  if (!result || result.score === undefined) return 0;
  return Math.max(0, 1 - result.score) * 0.6;
}

export interface ScoringOptions {
  useFuzzyMatching: boolean;
}

export function scoreCapabilities(
  capabilities: Capability[],
  prompt: string,
  options: ScoringOptions,
): CapabilityMatch[] {
  const promptLower = prompt.toLowerCase();
  const promptNormalized = normalizeForMatch(prompt);
  const promptTokens = new Set(tokenize(prompt));

  const bm25 = new Bm25Index(
    capabilities.map((c) => ({ id: c.id, text: c.description ?? "" })),
  );

  return capabilities.map((capability) => {
    const reasons: string[] = [];

    const nameScore = nameMatchScore(capability.name, promptLower, options.useFuzzyMatching);
    if (nameScore > 0.5) {
      reasons.push(`prompt mentions "${capability.name}"`);
    }

    // Coverage ratio (matched / total), not Jaccard: tags/keywords are short curated lists, and
    // Jaccard's union term unfairly punishes longer prompts that just happen to contain more words.
    const matchedTags = matchedItems(capability.tags, promptNormalized);
    const tagOverlap =
      capability.tags.length > 0 ? softenRatio(matchedTags.length / capability.tags.length) : 0;
    if (matchedTags.length > 0) {
      reasons.push(`matched tags: ${matchedTags.join(", ")}`);
    }

    const matchedKeywords = matchedItems(capability.keywords, promptNormalized);
    const keywordOverlap =
      capability.keywords.length > 0
        ? softenRatio(matchedKeywords.length / capability.keywords.length)
        : 0;
    if (matchedKeywords.length > 0) {
      reasons.push(`matched keywords: ${matchedKeywords.join(", ")}`);
    }

    const rawBm25 = bm25.score(capability.id, Array.from(promptTokens));
    const descriptionBm25 = rawBm25 > 0 ? rawBm25 / (rawBm25 + 1) : 0;
    if (descriptionBm25 > 0.3) {
      reasons.push("prompt closely matches the capability description");
    }

    let bestExampleSim = 0;
    for (const example of capability.examples) {
      const sim = jaccard(promptTokens, new Set(tokenize(example)));
      if (sim > bestExampleSim) bestExampleSim = sim;
    }
    if (bestExampleSim > 0.3) {
      reasons.push("prompt is similar to a documented usage example");
    }

    const sourceBoost = 1;
    const pinnedBoost = capability.priority === "high" ? 1 : 0;
    if (pinnedBoost) reasons.push("pinned as high priority");
    // Not implemented in the MVP (spec section 13: "MVP may only record recommended" usage
    // events) — always 0, and its weight is excluded from the denominator below rather than
    // left as an uncapturable ceiling on every score.
    const recentlyAcceptedBoost = 0;

    // A capability that simply has no tags/keywords/examples/description shouldn't be penalized
    // as if it failed to match on that signal — there was nothing to match against. Exclude that
    // weight from the denominator instead of always dividing by the full 125.
    const applicableWeights =
      WEIGHTS.exactNameMatch +
      (capability.tags.length > 0 ? WEIGHTS.tagOverlap : 0) +
      (capability.keywords.length > 0 ? WEIGHTS.keywordOverlap : 0) +
      (capability.description ? WEIGHTS.descriptionBM25 : 0) +
      (capability.examples.length > 0 ? WEIGHTS.examplePromptSimilarity : 0) +
      WEIGHTS.sourceBoost +
      WEIGHTS.pinnedBoost;

    const weightedSum =
      nameScore * WEIGHTS.exactNameMatch +
      tagOverlap * WEIGHTS.tagOverlap +
      keywordOverlap * WEIGHTS.keywordOverlap +
      descriptionBm25 * WEIGHTS.descriptionBM25 +
      bestExampleSim * WEIGHTS.examplePromptSimilarity +
      sourceBoost * WEIGHTS.sourceBoost +
      pinnedBoost * WEIGHTS.pinnedBoost +
      recentlyAcceptedBoost * WEIGHTS.recentlyAcceptedBoost;

    const score = applicableWeights > 0 ? Math.max(0, Math.min(1, weightedSum / applicableWeights)) : 0;

    return {
      capability,
      score,
      confidence: "low" as const,
      reasons,
    };
  });
}
