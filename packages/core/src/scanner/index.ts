import fg from "fast-glob";
import fs from "node:fs";
import os from "node:os";
import { builtinSourceRules, customPathRules, type SourceRule } from "./source-rules.js";
import { expandHome } from "../config/paths.js";

export interface DiscoveredFile {
  absPath: string;
  rule: SourceRule;
}

const MAX_FILE_BYTES = 512 * 1024;
const IGNORE = ["**/node_modules/**", "**/.git/**", "**/dist/**"];

export interface DiscoverOptions {
  cwd?: string;
  /** Override for the "global" root normally implied by the user's home directory. */
  homeDir?: string;
  extraScanPaths?: string[];
}

export function discoverFiles(options: DiscoverOptions = {}): DiscoveredFile[] {
  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? os.homedir();
  const extraScanPaths = (options.extraScanPaths ?? []).map(expandHome);

  const rules = [...builtinSourceRules(homeDir, cwd), ...customPathRules(extraScanPaths)];

  const seen = new Map<string, DiscoveredFile>();

  for (const rule of rules) {
    for (const pattern of rule.globs) {
      let matches: string[];
      try {
        matches = fg.sync(pattern, {
          dot: true,
          absolute: true,
          onlyFiles: true,
          followSymbolicLinks: false,
          ignore: IGNORE,
          suppressErrors: true,
        });
      } catch {
        continue;
      }
      for (const absPath of matches) {
        if (seen.has(absPath)) continue;
        try {
          const stat = fs.statSync(absPath);
          if (stat.size > MAX_FILE_BYTES) continue;
        } catch {
          continue;
        }
        seen.set(absPath, { absPath, rule });
      }
    }
  }

  return Array.from(seen.values());
}
