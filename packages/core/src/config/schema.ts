import { z } from "zod";

export const configSchema = z.object({
  version: z.number().default(1),
  scanPaths: z.array(z.string()).default([]),
  minScore: z.number().min(0).max(1).default(0.75),
  maxRecommendations: z.number().int().min(1).max(5).default(3),
  includePathsInOutput: z.boolean().default(true),
  outputPathMode: z.enum(["full", "relative", "hidden"]).default("relative"),
  autoScan: z
    .object({
      enabled: z.boolean().default(true),
      maxAgeMinutes: z.number().int().min(1).default(60),
    })
    .default({ enabled: true, maxAgeMinutes: 60 }),
  matching: z
    .object({
      useEmbeddings: z.boolean().default(false),
      useKeywordMatching: z.boolean().default(true),
      useFuzzyMatching: z.boolean().default(true),
    })
    .default({ useEmbeddings: false, useKeywordMatching: true, useFuzzyMatching: true }),
  privacy: z
    .object({
      allowCloudMetadataGeneration: z.boolean().default(false),
      allowCloudEmbeddings: z.boolean().default(false),
    })
    .default({ allowCloudMetadataGeneration: false, allowCloudEmbeddings: false }),
  logging: z
    .object({
      level: z.enum(["error", "warn", "info", "debug"]).default("warn"),
      logPromptText: z.boolean().default(false),
    })
    .default({ level: "warn", logPromptText: false }),
});

export type ConfigInput = z.input<typeof configSchema>;
