import type { Db } from "./storage/db.js";
import type { Capability, CapabilityMatch, SkillSenseConfig } from "./types.js";
import { listCapabilities as listCapabilitiesFromDb, getCapabilityByIdOrName } from "./storage/capabilities.js";
import { scoreCapabilities } from "./matcher/score.js";
import { rankMatches } from "./ranker/index.js";

export const VERSION = "0.1.0";

export * from "./types.js";
export { openDb, dbExists } from "./storage/db.js";
export type { Db } from "./storage/db.js";
export {
  upsertCapability,
  listCapabilities,
  getCapabilityByIdOrName,
  countCapabilities,
} from "./storage/capabilities.js";
export { recordUsageEvent, hashPrompt } from "./storage/usage.js";
export { scan } from "./indexer/index.js";
export type { ScanOptions } from "./indexer/index.js";
export {
  loadConfig,
  saveConfig,
  defaultConfig,
  getConfigValue,
  setConfigValue,
  addScanPath,
  resolveConfigPath,
  resolveDbPath,
  resolveLogPath,
  resolveStateDir,
  expandHome,
} from "./config/index.js";
export {
  formatRecommendationBody,
  formatClaudeHookOutput,
  formatCodexHookOutput,
} from "./formatter/index.js";
export type { FormatOptions, CodexHookOutput } from "./formatter/index.js";

function enabledCapabilities(db: Db): Capability[] {
  return listCapabilitiesFromDb(db).filter((c) => c.enabled);
}

/** Scores every enabled capability against the prompt, sorted best-first, no threshold applied. Used by `skillsense search`. */
export function scoreAllCapabilities(
  db: Db,
  prompt: string,
  config: SkillSenseConfig,
): CapabilityMatch[] {
  const capabilities = enabledCapabilities(db);
  const matches = scoreCapabilities(capabilities, prompt, {
    useFuzzyMatching: config.matching.useFuzzyMatching,
  });
  return matches.sort((a, b) => b.score - a.score);
}

/** Applies the section-9 recommendation thresholds. Used by the Claude/Codex hook adapters. */
export function recommendForPrompt(
  db: Db,
  prompt: string,
  config: SkillSenseConfig,
): CapabilityMatch[] {
  const scored = scoreAllCapabilities(db, prompt, config);
  return rankMatches(scored, {
    minScore: config.minScore,
    maxRecommendations: config.maxRecommendations,
  });
}

/** Scores a single named/id'd capability against a prompt, for `skillsense explain`. */
export function explainMatch(
  db: Db,
  idOrName: string,
  prompt: string,
  config: SkillSenseConfig,
): CapabilityMatch | undefined {
  const capability = getCapabilityByIdOrName(db, idOrName);
  if (!capability) return undefined;
  const [match] = scoreCapabilities([capability], prompt, {
    useFuzzyMatching: config.matching.useFuzzyMatching,
  });
  return match;
}
