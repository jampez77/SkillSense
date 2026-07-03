const SOURCE_LABELS: Record<string, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  github: "GitHub",
  generic: "generic",
  custom: "custom",
};

const TYPE_LABELS: Record<string, string> = {
  skill: "skill",
  command: "command",
  agent: "agent",
  mcp_server: "MCP server",
  hook: "hook",
  instruction_file: "instruction file",
  prompt_template: "prompt template",
  rule: "rule",
  script: "script",
  unknown: "capability",
};

function pluralize(label: string, count: number): string {
  if (count === 1) return label;
  if (label.endsWith("y") && !/[aeiou]y$/.test(label)) return `${label.slice(0, -1)}ies`;
  return `${label}s`;
}

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export function sourceTypeLine(sourceTypeKey: string, count: number): string {
  const [source, type] = sourceTypeKey.split(":");
  const label = pluralize(typeLabel(type ?? "unknown"), count);
  return `${count} ${sourceLabel(source ?? "generic")} ${label}`;
}
