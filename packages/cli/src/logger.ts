import fs from "node:fs";
import path from "node:path";
import { resolveLogPath } from "@skillsense/core";
import type { SkillSenseConfig } from "@skillsense/core";

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type Level = keyof typeof LEVELS;

/** Debug/diagnostic logs go to a file only — never stdout, so hook output stays clean (spec section 23). */
export function log(config: SkillSenseConfig, level: Level, message: string): void {
  const debugForced = process.env.SKILLSENSE_DEBUG === "1";
  const configuredLevel = debugForced ? "debug" : config.logging.level;
  if (LEVELS[level] > LEVELS[configuredLevel]) return;

  try {
    const logPath = resolveLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const line = `${new Date().toISOString()} [${level}] ${message}\n`;
    fs.appendFileSync(logPath, line, "utf-8");
  } catch {
    // Logging must never throw or touch stdout.
  }
}
