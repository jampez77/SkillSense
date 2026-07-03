import { describe, it, expect } from "vitest";
import { parseMcpJson, parseMcpToml } from "./mcp.js";

describe("parseMcpJson", () => {
  it("extracts mcpServers entries as mcp_server capabilities", () => {
    const json = JSON.stringify({
      mcpServers: {
        github: { command: "npx", args: ["-y", "@modelcontextprotocol/server-github"], description: "GitHub MCP" },
      },
    });
    const result = parseMcpJson(json);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("github");
    expect(result[0]?.type).toBe("mcp_server");
    expect(result[0]?.description).toBe("GitHub MCP");
  });

  it("marks a server disabled when disabled: true", () => {
    const json = JSON.stringify({ mcpServers: { foo: { command: "foo", disabled: true } } });
    const result = parseMcpJson(json);
    expect(result[0]?.enabled).toBe(false);
  });

  it("returns an empty array for invalid JSON", () => {
    expect(parseMcpJson("not json")).toEqual([]);
  });
});

describe("parseMcpToml", () => {
  it("extracts mcp_servers tables from TOML", () => {
    const toml = `
[mcp_servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
`;
    const result = parseMcpToml(toml);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("github");
    expect(result[0]?.type).toBe("mcp_server");
  });
});
