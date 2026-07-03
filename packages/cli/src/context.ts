import { loadConfig, openDb, resolveDbPath, type SkillSenseConfig, type Db } from "@skillsense/core";

export interface CliContext {
  config: SkillSenseConfig;
  dbPath: string;
  db: Db;
}

export function createContext(): CliContext {
  const config = loadConfig();
  const dbPath = resolveDbPath();
  const db = openDb(dbPath);
  return { config, dbPath, db };
}
