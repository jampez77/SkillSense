import type { ParsedCapability } from "./types.js";

interface HookEntry {
  type?: string;
  command?: string;
  statusMessage?: string;
}

interface HookGroup {
  hooks?: HookEntry[];
}

export function parseHooksJson(rawContent: string): ParsedCapability[] {
  try {
    const data = JSON.parse(rawContent) as { hooks?: Record<string, HookGroup[]> };
    const events = data.hooks ?? {};
    const results: ParsedCapability[] = [];

    for (const [eventName, groups] of Object.entries(events)) {
      let index = 0;
      for (const group of groups ?? []) {
        for (const hook of group.hooks ?? []) {
          index += 1;
          const suffix = index > 1 ? `-${index}` : "";
          results.push({
            name: `${eventName}${suffix}`,
            type: "hook",
            description: hook.statusMessage ?? hook.command,
            tags: ["hook", eventName],
            keywords: [],
            examples: [],
            rawFrontmatter: hook as Record<string, unknown>,
            enabled: true,
          });
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}
