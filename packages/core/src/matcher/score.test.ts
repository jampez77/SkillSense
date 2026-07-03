import { describe, it, expect } from "vitest";
import { scoreCapabilities } from "./score.js";
import type { Capability } from "../types.js";

function makeCapability(overrides: Partial<Capability> = {}): Capability {
  return {
    id: "cap-1",
    name: "flutter-performance-review",
    type: "skill",
    source: "claude",
    path: "/x/SKILL.md",
    description:
      "Use this when debugging Flutter jank, slow scrolling, excessive rebuilds, animation frame drops, or rendering performance issues.",
    tags: ["flutter", "performance", "mobile"],
    keywords: ["flutter", "performance", "rebuilds", "jank", "scrolling", "review"],
    examples: [],
    contentHash: "abc",
    lastIndexedAt: new Date().toISOString(),
    enabled: true,
    ...overrides,
  };
}

describe("scoreCapabilities", () => {
  it("scores an unrelated prompt near zero", () => {
    const [match] = scoreCapabilities([makeCapability()], "what is the weather today", {
      useFuzzyMatching: true,
    });
    expect(match?.score).toBeLessThan(0.2);
  });

  it("scores a strongly matching prompt highly and above a moderately related one", () => {
    const capability = makeCapability();
    const [strong] = scoreCapabilities(
      [capability],
      "Can you review this Flutter widget for performance issues, jank, and slow scrolling during rebuilds?",
      { useFuzzyMatching: true },
    );
    const [moderate] = scoreCapabilities([capability], "debug Flutter jank", { useFuzzyMatching: true });

    expect(strong?.score).toBeGreaterThan(0.75);
    expect(moderate?.score).toBeGreaterThan(0);
    expect(strong?.score).toBeGreaterThan(moderate?.score ?? 0);
  });

  it("matches hyphenated tags against a space-separated mention in the prompt", () => {
    const capability = makeCapability({
      name: "github-pr-review",
      tags: ["github", "pull-request", "code-review"],
      keywords: ["review", "pull", "request"],
      description: "Reviews GitHub pull requests.",
    });
    const [match] = scoreCapabilities([capability], "please review this pull request", {
      useFuzzyMatching: true,
    });
    expect(match?.reasons.join(" ")).toContain("pull-request");
  });

  it("includes a pinned-priority reason and boost for high priority capabilities", () => {
    const capability = makeCapability({ priority: "high" });
    const [match] = scoreCapabilities([capability], "unrelated prompt", { useFuzzyMatching: true });
    expect(match?.reasons).toContain("pinned as high priority");
  });

  it("does not penalize a capability for having no tags/keywords/examples", () => {
    const capability = makeCapability({ tags: [], keywords: [], examples: [] });
    const [match] = scoreCapabilities([capability], "flutter performance review", {
      useFuzzyMatching: true,
    });
    expect(match?.score).toBeGreaterThan(0);
  });
});
