import { describe, it, expect } from "vitest";
import { formatRecommendationBody, formatClaudeHookOutput, formatCodexHookOutput } from "./index.js";
import type { Capability, CapabilityMatch } from "../types.js";

const options = { includePathsInOutput: true, includeReasonsInOutput: true, outputPathMode: "full" as const };

function makeMatch(): CapabilityMatch {
  const capability: Capability = {
    id: "cap-1",
    name: "flutter-performance-review",
    type: "skill",
    source: "claude",
    path: "/Users/x/.claude/skills/flutter-performance-review/SKILL.md",
    tags: [],
    keywords: [],
    examples: [],
    contentHash: "abc",
    lastIndexedAt: new Date().toISOString(),
    enabled: true,
  };
  return { capability, score: 0.9, confidence: "high", reasons: ["prompt mentions Flutter, jank, scrolling"] };
}

describe("formatRecommendationBody", () => {
  it("returns an empty string for no matches", () => {
    expect(formatRecommendationBody([], options)).toBe("");
  });

  it("includes name, type, source, reason, and path for a match", () => {
    const body = formatRecommendationBody([makeMatch()], options);
    expect(body).toContain("flutter-performance-review");
    expect(body).toContain("Type: skill");
    expect(body).toContain("Source: claude");
    expect(body).toContain("Reason: prompt mentions Flutter, jank, scrolling");
    expect(body).toContain("Path: /Users/x/.claude/skills/flutter-performance-review/SKILL.md");
    expect(body).toContain("Use these capabilities only if they are appropriate for the task.");
  });

  it("omits the path line when outputPathMode is hidden", () => {
    const body = formatRecommendationBody([makeMatch()], { ...options, outputPathMode: "hidden" });
    expect(body).not.toContain("Path:");
  });

  it("omits reasons when includeReasonsInOutput is false", () => {
    const body = formatRecommendationBody([makeMatch()], { ...options, includeReasonsInOutput: false });
    expect(body).not.toContain("Reason:");
  });
});

describe("formatClaudeHookOutput / formatCodexHookOutput", () => {
  it("claude output is the plain text body", () => {
    expect(formatClaudeHookOutput([makeMatch()], options)).toContain("SkillSense capability recall:");
  });

  it("codex output wraps the same body in hookSpecificOutput.additionalContext", () => {
    const output = formatCodexHookOutput([makeMatch()], options);
    expect(output?.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(output?.hookSpecificOutput.additionalContext).toContain("flutter-performance-review");
  });

  it("codex output is null for no matches", () => {
    expect(formatCodexHookOutput([], options)).toBeNull();
  });
});
