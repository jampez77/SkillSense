import type { Db } from "./db.js";
import type { Capability, CapabilityType, CapabilitySource } from "../types.js";

interface CapabilityRow {
  id: string;
  name: string;
  type: string;
  source: string;
  path: string;
  description: string | null;
  tags_json: string;
  keywords_json: string;
  examples_json: string;
  raw_frontmatter_json: string | null;
  content_hash: string;
  modified_at: string | null;
  last_indexed_at: string;
  priority: string | null;
  enabled: number;
}

function rowToCapability(row: CapabilityRow): Capability {
  return {
    id: row.id,
    name: row.name,
    type: row.type as CapabilityType,
    source: row.source as CapabilitySource,
    path: row.path,
    description: row.description ?? undefined,
    tags: JSON.parse(row.tags_json),
    keywords: JSON.parse(row.keywords_json),
    examples: JSON.parse(row.examples_json),
    rawFrontmatter: row.raw_frontmatter_json ? JSON.parse(row.raw_frontmatter_json) : undefined,
    contentHash: row.content_hash,
    modifiedAt: row.modified_at ?? undefined,
    lastIndexedAt: row.last_indexed_at,
    priority: (row.priority as Capability["priority"]) ?? undefined,
    enabled: row.enabled === 1,
  };
}

export function upsertCapability(db: Db, cap: Capability): void {
  db.prepare(
    `INSERT INTO capabilities (
      id, name, type, source, path, description, tags_json, keywords_json, examples_json,
      raw_frontmatter_json, content_hash, modified_at, last_indexed_at, priority, enabled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      source = excluded.source,
      path = excluded.path,
      description = excluded.description,
      tags_json = excluded.tags_json,
      keywords_json = excluded.keywords_json,
      examples_json = excluded.examples_json,
      raw_frontmatter_json = excluded.raw_frontmatter_json,
      content_hash = excluded.content_hash,
      modified_at = excluded.modified_at,
      last_indexed_at = excluded.last_indexed_at,
      priority = excluded.priority,
      enabled = excluded.enabled`,
  ).run(
    cap.id,
    cap.name,
    cap.type,
    cap.source,
    cap.path,
    cap.description ?? null,
    JSON.stringify(cap.tags),
    JSON.stringify(cap.keywords),
    JSON.stringify(cap.examples),
    cap.rawFrontmatter ? JSON.stringify(cap.rawFrontmatter) : null,
    cap.contentHash,
    cap.modifiedAt ?? null,
    cap.lastIndexedAt,
    cap.priority ?? null,
    cap.enabled ? 1 : 0,
  );
}

export function deleteMissingCapabilities(db: Db, keepIds: string[]): number {
  if (keepIds.length === 0) {
    const result = db.prepare(`DELETE FROM capabilities`).run();
    return Number(result.changes);
  }
  const placeholders = keepIds.map(() => "?").join(",");
  const result = db.prepare(`DELETE FROM capabilities WHERE id NOT IN (${placeholders})`).run(...keepIds);
  return Number(result.changes);
}

export function listCapabilities(
  db: Db,
  filter: { source?: string; type?: string } = {},
): Capability[] {
  let query = "SELECT * FROM capabilities WHERE 1=1";
  const params: string[] = [];
  if (filter.source) {
    query += " AND source = ?";
    params.push(filter.source);
  }
  if (filter.type) {
    query += " AND type = ?";
    params.push(filter.type);
  }
  query += " ORDER BY name ASC";
  const rows = db.prepare(query).all(...params) as unknown as CapabilityRow[];
  return rows.map(rowToCapability);
}

export function getCapabilityByIdOrName(db: Db, idOrName: string): Capability | undefined {
  const byId = db.prepare("SELECT * FROM capabilities WHERE id = ?").get(idOrName) as
    | CapabilityRow
    | undefined;
  if (byId) return rowToCapability(byId);
  const byName = db.prepare("SELECT * FROM capabilities WHERE name = ?").get(idOrName) as
    | CapabilityRow
    | undefined;
  return byName ? rowToCapability(byName) : undefined;
}

export function countCapabilities(db: Db): number {
  const row = db.prepare("SELECT COUNT(*) as c FROM capabilities").get() as { c: number };
  return row.c;
}

export function listAllIdsAndPaths(db: Db): Array<{ id: string; path: string }> {
  return db.prepare("SELECT id, path FROM capabilities").all() as unknown as Array<{
    id: string;
    path: string;
  }>;
}

export function deleteCapabilitiesByIds(db: Db, ids: string[]): number {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => "?").join(",");
  const result = db.prepare(`DELETE FROM capabilities WHERE id IN (${placeholders})`).run(...ids);
  return Number(result.changes);
}
