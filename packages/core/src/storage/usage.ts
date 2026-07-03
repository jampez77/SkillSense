import crypto from "node:crypto";
import type { Db } from "./db.js";
import type { UsageEventType } from "../types.js";

export function recordUsageEvent(
  db: Db,
  params: {
    capabilityId: string;
    eventType: UsageEventType;
    promptHash?: string;
    score?: number;
  },
): void {
  db.prepare(
    `INSERT INTO usage_events (id, capability_id, event_type, prompt_hash, score, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    crypto.randomUUID(),
    params.capabilityId,
    params.eventType,
    params.promptHash ?? null,
    params.score ?? null,
    new Date().toISOString(),
  );
}

export function hashPrompt(prompt: string): string {
  return crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}
