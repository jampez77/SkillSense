import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import fs from "node:fs";
import { ensureDirFor } from "../config/paths.js";

// A type-only import above is erased at build time, so it never reaches esbuild's module
// resolution. A *value* import of "node:sqlite" does reach it, and esbuild (as bundled by both
// tsup and Vite/vitest) strips the "node:" prefix for this still-fairly-new builtin, producing a
// bare "sqlite" specifier that fails to resolve at runtime. process.getBuiltinModule() sidesteps
// the whole problem: it's a plain runtime call, not a static import specifier.
const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS capabilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  path TEXT NOT NULL,
  description TEXT,
  tags_json TEXT NOT NULL,
  keywords_json TEXT NOT NULL,
  examples_json TEXT NOT NULL,
  raw_frontmatter_json TEXT,
  content_hash TEXT NOT NULL,
  modified_at TEXT,
  last_indexed_at TEXT NOT NULL,
  priority TEXT,
  enabled INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  capability_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  prompt_hash TEXT,
  score REAL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);
`;

export function openDb(dbPath: string): DatabaseSyncType {
  const isMemory = dbPath === ":memory:";
  if (!isMemory) {
    ensureDirFor(dbPath);
  }
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  return db;
}

export function dbExists(dbPath: string): boolean {
  return fs.existsSync(dbPath);
}

export type Db = DatabaseSyncType;
