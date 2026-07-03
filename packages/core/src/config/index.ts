import fs from "node:fs";
import YAML from "yaml";
import { configSchema } from "./schema.js";
import type { SkillSenseConfig } from "../types.js";
import { resolveConfigPath, ensureDirFor } from "./paths.js";

export { resolveConfigPath, resolveDbPath, resolveLogPath, resolveStateDir, expandHome } from "./paths.js";

export function defaultConfig(): SkillSenseConfig {
  return configSchema.parse({});
}

export function loadConfig(configPath: string = resolveConfigPath()): SkillSenseConfig {
  if (!fs.existsSync(configPath)) {
    return defaultConfig();
  }
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = YAML.parse(raw) ?? {};
    return configSchema.parse(parsed);
  } catch {
    return defaultConfig();
  }
}

export function saveConfig(config: SkillSenseConfig, configPath: string = resolveConfigPath()): void {
  ensureDirFor(configPath);
  const validated = configSchema.parse(config);
  fs.writeFileSync(configPath, YAML.stringify(validated), "utf-8");
}

export function getConfigValue(config: SkillSenseConfig, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, config);
}

export function setConfigValue(config: SkillSenseConfig, key: string, value: unknown): SkillSenseConfig {
  const parts = key.split(".");
  const clone: Record<string, unknown> = structuredClone(config as unknown as Record<string, unknown>);
  let cursor = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i] as string;
    const next = cursor[part];
    if (typeof next !== "object" || next === null) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  const lastKey = parts[parts.length - 1] as string;
  cursor[lastKey] = coerceValue(value);
  return configSchema.parse(clone);
}

export function addScanPath(config: SkillSenseConfig, newPath: string): SkillSenseConfig {
  const scanPaths = Array.from(new Set([...config.scanPaths, newPath]));
  return configSchema.parse({ ...config, scanPaths });
}

function coerceValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  const asNumber = Number(value);
  if (value.trim() !== "" && !Number.isNaN(asNumber)) return asNumber;
  return value;
}

export { configSchema } from "./schema.js";
