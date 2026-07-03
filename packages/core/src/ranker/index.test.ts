import { describe, it, expect } from "vitest";
import { rankMatches } from "./index.js";
import type { Capability, CapabilityMatch } from "../types.js";

function makeMatch(score: number, overrides: Partial<Capability> = {}): CapabilityMatch {
  const capability: Capability = {
    id: `cap-${score}-${Math.round(Math.random() * 1e6)}`,
    name: "test-capability",
    type: "skill",
    source: "claude",
    path: "/x/SKILL.md",
    tags: [],
    keywords: [],
    examples: [],
    contentHash: "abc",
    lastIndexedAt: new Date().toISOString(),
    enabled: true,
    ...overrides,
  };
  return { capability, score, confidence: "low", reasons: [] };
}

describe("rankMatches", () => {
  it("recommends nothing below the low threshold", () => {
    expect(rankMatches([makeMatch(0.4)])).toEqual([]);
  });

  it("recommends a single top result at >=0.60 when clearly better than the runner-up", () => {
    const result = rankMatches([makeMatch(0.68), makeMatch(0.3)]);
    expect(result).toHaveLength(1);
    expect(result[0]?.score).toBe(0.68);
    expect(["low", "medium"]).toContain(result[0]?.confidence);
  });

  it("recommends nothing at >=0.60 when the runner-up is too close", () => {
    const result = rankMatches([makeMatch(0.65), makeMatch(0.63)]);
    expect(result).toEqual([]);
  });

  it("marks results >= 0.75 as high confidence and includes multiple", () => {
    const result = rankMatches([makeMatch(0.9), makeMatch(0.8), makeMatch(0.5)]);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.confidence === "high")).toBe(true);
  });

  it("caps recommendations at the configured max, and never above the hard max of 5", () => {
    const matches = Array.from({ length: 8 }, () => makeMatch(0.9));
    expect(rankMatches(matches, { maxRecommendations: 3 })).toHaveLength(3);
    expect(rankMatches(matches, { maxRecommendations: 10 })).toHaveLength(5);
  });

  it("excludes disabled capabilities", () => {
    const result = rankMatches([makeMatch(0.9, { enabled: false })]);
    expect(result).toEqual([]);
  });
});
