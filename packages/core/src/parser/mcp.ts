import * as TOML from "smol-toml";
import type { ParsedCapability } from "./types.js";

interface McpServerEntry {
  command?: string;
  description?: string;
  disabled?: boolean;
  enabled?: boolean;
  tools?: string[];
  args?: string[];
}

function toParsedCapability(name: string, entry: McpServerEntry): ParsedCapability {
  const commandLine = [entry.command, ...(entry.args ?? [])].filter(Boolean).join(" ");
  const description = entry.description ?? (commandLine ? `MCP server command: ${commandLine}` : undefined);
  const enabled = entry.disabled === true ? false : entry.enabled !== false;

  return {
    name,
    type: "mcp_server",
    description,
    tags: ["mcp"],
    keywords: Array.isArray(entry.tools) ? entry.tools : [],
    examples: [],
    rawFrontmatter: entry as Record<string, unknown>,
    enabled,
  };
}

function extractServersFromObject(obj: unknown): ParsedCapability[] {
  if (!obj || typeof obj !== "object") return [];
  const record = obj as Record<string, unknown>;
  const serversBlock =
    (record.mcpServers as Record<string, unknown> | undefined) ??
    (record.mcp_servers as Record<string, unknown> | undefined);
  if (!serversBlock || typeof serversBlock !== "object") return [];

  return Object.entries(serversBlock).map(([name, entry]) =>
    toParsedCapability(name, (entry ?? {}) as McpServerEntry),
  );
}

export function parseMcpJson(rawContent: string): ParsedCapability[] {
  try {
    const data = JSON.parse(rawContent);
    return extractServersFromObject(data);
  } catch {
    return [];
  }
}

export function parseMcpToml(rawContent: string): ParsedCapability[] {
  try {
    const data = TOML.parse(rawContent);
    return extractServersFromObject(data);
  } catch {
    return [];
  }
}
