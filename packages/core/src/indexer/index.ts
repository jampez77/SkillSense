import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import { discoverFiles, type DiscoveredFile } from "../scanner/index.js";
import { parseMarkdownCapability } from "../parser/markdown.js";
import { parseInstructionFile } from "../parser/instructions.js";
import { parseMcpJson, parseMcpToml } from "../parser/mcp.js";
import { parseHooksJson } from "../parser/hooks.js";
import type { ParsedCapability } from "../parser/types.js";
import type { Capability, ScanResult } from "../types.js";
import type { Db } from "../storage/db.js";
import {
  upsertCapability,
  listAllIdsAndPaths,
  deleteCapabilitiesByIds,
} from "../storage/capabilities.js";
import { expandHome } from "../config/paths.js";

function hashId(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function parseFile(file: DiscoveredFile, content: string): ParsedCapability[] {
  const { rule } = file;
  switch (rule.kind) {
    case "skill-markdown":
      return [parseMarkdownCapability(file.absPath, content, rule.defaultType, true)];
    case "markdown":
      return [parseMarkdownCapability(file.absPath, content, rule.defaultType, false)];
    case "instruction":
      return [parseInstructionFile(file.absPath, content, rule.defaultType)];
    case "mcp-json":
      return parseMcpJson(content);
    case "mcp-toml":
      return parseMcpToml(content);
    case "hooks-json":
      return parseHooksJson(content);
    default:
      return [];
  }
}

export interface ScanOptions {
  cwd?: string;
  /** Override for the "global" root normally implied by the user's home directory (used by `scan --path`). */
  homeDir?: string;
  extraScanPaths?: string[];
  onFile?: (absPath: string) => void;
}

export function scan(db: Db, options: ScanOptions = {}): ScanResult {
  const start = Date.now();
  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? os.homedir();
  const extraScanPaths = options.extraScanPaths ?? [];
  const files = discoverFiles({ cwd, homeDir, extraScanPaths });

  const keepIds = new Set<string>();
  const bySource: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const bySourceType: Record<string, number> = {};
  const now = new Date().toISOString();

  for (const file of files) {
    let content: string;
    let modifiedAt: string | undefined;
    try {
      content = fs.readFileSync(file.absPath, "utf-8");
      modifiedAt = fs.statSync(file.absPath).mtime.toISOString();
    } catch {
      continue;
    }

    options.onFile?.(file.absPath);

    let parsedList: ParsedCapability[];
    try {
      parsedList = parseFile(file, content);
    } catch {
      continue;
    }

    for (const parsed of parsedList) {
      const idSeed = parsedList.length > 1 ? `${file.absPath}::${parsed.name}` : file.absPath;
      const id = hashId(idSeed);
      const capability: Capability = {
        id,
        name: parsed.name,
        type: parsed.type,
        source: file.rule.source,
        path: file.absPath,
        description: parsed.description,
        tags: parsed.tags,
        keywords: parsed.keywords,
        examples: parsed.examples,
        rawFrontmatter: parsed.rawFrontmatter,
        contentHash: hashContent(content),
        lastIndexedAt: now,
        modifiedAt,
        priority: parsed.priority,
        enabled: parsed.enabled,
      };

      upsertCapability(db, capability);
      keepIds.add(id);
      bySource[capability.source] = (bySource[capability.source] ?? 0) + 1;
      byType[capability.type] = (byType[capability.type] ?? 0) + 1;
      const sourceTypeKey = `${capability.source}:${capability.type}`;
      bySourceType[sourceTypeKey] = (bySourceType[sourceTypeKey] ?? 0) + 1;
    }
  }

  const scannedRoots = [homeDir, cwd, ...extraScanPaths.map(expandHome)];
  const staleIds = listAllIdsAndPaths(db)
    .filter((row) => !keepIds.has(row.id) && scannedRoots.some((root) => row.path.startsWith(root)))
    .map((row) => row.id);
  deleteCapabilitiesByIds(db, staleIds);

  return {
    scanned: files.length,
    indexed: keepIds.size,
    bySource,
    byType,
    bySourceType,
    durationMs: Date.now() - start,
  };
}
