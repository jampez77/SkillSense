export type CapabilityType =
  | "skill"
  | "command"
  | "agent"
  | "mcp_server"
  | "hook"
  | "instruction_file"
  | "prompt_template"
  | "rule"
  | "script"
  | "unknown";

export type CapabilitySource = "claude" | "codex" | "cursor" | "github" | "generic" | "custom";

export type Priority = "low" | "normal" | "high";

export interface Capability {
  id: string;
  name: string;
  type: CapabilityType;
  source: CapabilitySource;
  path: string;

  description?: string;
  tags: string[];
  keywords: string[];
  examples: string[];

  rawFrontmatter?: Record<string, unknown>;
  contentHash: string;
  lastIndexedAt: string;
  modifiedAt?: string;

  priority?: Priority;
  enabled: boolean;
}

export type Confidence = "low" | "medium" | "high";

export interface CapabilityMatch {
  capability: Capability;
  score: number;
  confidence: Confidence;
  reasons: string[];
}

export type UsageEventType =
  | "recommended"
  | "accepted"
  | "dismissed"
  | "suppressed"
  | "manually_pinned"
  | "manually_disabled";

export interface UsageEvent {
  id: string;
  capabilityId: string;
  eventType: UsageEventType;
  promptHash?: string;
  score?: number;
  createdAt: string;
}

export type OutputPathMode = "full" | "relative" | "hidden";

export interface SkillSenseConfig {
  version: number;
  scanPaths: string[];
  minScore: number;
  maxRecommendations: number;
  includePathsInOutput: boolean;
  includeReasonsInOutput: boolean;
  outputPathMode: OutputPathMode;
  autoScan: {
    enabled: boolean;
    maxAgeMinutes: number;
  };
  matching: {
    useEmbeddings: boolean;
    useKeywordMatching: boolean;
    useFuzzyMatching: boolean;
  };
  privacy: {
    allowCloudMetadataGeneration: boolean;
    allowCloudEmbeddings: boolean;
  };
  logging: {
    level: "error" | "warn" | "info" | "debug";
    logPromptText: boolean;
  };
}

export interface ScanResult {
  scanned: number;
  indexed: number;
  bySource: Record<string, number>;
  byType: Record<string, number>;
  /** Keyed as "<source>:<type>", e.g. "claude:skill" -> 12. Drives the human-readable scan summary. */
  bySourceType: Record<string, number>;
  durationMs: number;
}
