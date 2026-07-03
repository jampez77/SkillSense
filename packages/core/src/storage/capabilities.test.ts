import { describe, it, expect } from "vitest";
import { openDb } from "./db.js";
import {
  upsertCapability,
  listCapabilities,
  getCapabilityByIdOrName,
  countCapabilities,
  deleteCapabilitiesByIds,
  listAllIdsAndPaths,
} from "./capabilities.js";
import type { Capability } from "../types.js";

function makeCapability(overrides: Partial<Capability> = {}): Capability {
  return {
    id: "cap-1",
    name: "flutter-performance-review",
    type: "skill",
    source: "claude",
    path: "/x/SKILL.md",
    description: "desc",
    tags: ["flutter"],
    keywords: ["flutter"],
    examples: [],
    contentHash: "abc",
    lastIndexedAt: new Date().toISOString(),
    enabled: true,
    ...overrides,
  };
}

describe("capabilities storage", () => {
  it("upserts and round-trips a capability", () => {
    const db = openDb(":memory:");
    upsertCapability(db, makeCapability());
    const all = listCapabilities(db);
    expect(all).toHaveLength(1);
    expect(all[0]?.name).toBe("flutter-performance-review");
    expect(all[0]?.tags).toEqual(["flutter"]);
  });

  it("upsert on the same id updates rather than duplicates", () => {
    const db = openDb(":memory:");
    upsertCapability(db, makeCapability());
    upsertCapability(db, makeCapability({ description: "updated desc" }));
    expect(countCapabilities(db)).toBe(1);
    expect(getCapabilityByIdOrName(db, "cap-1")?.description).toBe("updated desc");
  });

  it("filters by source and type", () => {
    const db = openDb(":memory:");
    upsertCapability(db, makeCapability({ id: "a", source: "claude", type: "skill" }));
    upsertCapability(db, makeCapability({ id: "b", source: "codex", type: "command" }));
    expect(listCapabilities(db, { source: "claude" })).toHaveLength(1);
    expect(listCapabilities(db, { type: "command" })).toHaveLength(1);
  });

  it("looks capabilities up by id or by name", () => {
    const db = openDb(":memory:");
    upsertCapability(db, makeCapability());
    expect(getCapabilityByIdOrName(db, "cap-1")?.id).toBe("cap-1");
    expect(getCapabilityByIdOrName(db, "flutter-performance-review")?.id).toBe("cap-1");
    expect(getCapabilityByIdOrName(db, "nonexistent")).toBeUndefined();
  });

  it("deletes capabilities by id", () => {
    const db = openDb(":memory:");
    upsertCapability(db, makeCapability({ id: "a" }));
    upsertCapability(db, makeCapability({ id: "b" }));
    deleteCapabilitiesByIds(db, ["a"]);
    const remaining = listAllIdsAndPaths(db);
    expect(remaining.map((r) => r.id)).toEqual(["b"]);
  });
});
