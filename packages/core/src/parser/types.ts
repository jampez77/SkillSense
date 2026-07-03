import type { CapabilityType, Priority } from "../types.js";

export interface ParsedCapability {
  name: string;
  type: CapabilityType;
  description?: string;
  tags: string[];
  keywords: string[];
  examples: string[];
  rawFrontmatter?: Record<string, unknown>;
  priority?: Priority;
  enabled: boolean;
}
