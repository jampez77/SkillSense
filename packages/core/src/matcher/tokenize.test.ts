import { describe, it, expect } from "vitest";
import { tokenize, jaccard, extractKeywords } from "./tokenize.js";

describe("tokenize", () => {
  it("lowercases and strips stopwords", () => {
    expect(tokenize("The Quick Brown Fox")).toEqual(["quick", "brown", "fox"]);
  });

  it("keeps hyphenated compound words as single tokens", () => {
    expect(tokenize("pull-request review")).toEqual(["pull-request", "review"]);
  });

  it("returns an empty array for empty input", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("jaccard", () => {
  it("is 1 for identical sets and 0 for disjoint sets", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
    expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("is 0 when either set is empty", () => {
    expect(jaccard(new Set(), new Set(["a"]))).toBe(0);
  });
});

describe("extractKeywords", () => {
  it("weights heading terms above body terms", () => {
    const keywords = extractKeywords(["Flutter Performance"], "some other body text here", 2);
    expect(keywords).toContain("flutter");
    expect(keywords).toContain("performance");
  });

  it("caps output at the requested max", () => {
    const keywords = extractKeywords([], "one two three four five six seven", 3);
    expect(keywords).toHaveLength(3);
  });
});
