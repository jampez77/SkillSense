import { describe, it, expect } from "vitest";
import { parseHooksJson } from "./hooks.js";

describe("parseHooksJson", () => {
  it("extracts one hook capability per registered command", () => {
    const json = JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { hooks: [{ type: "command", command: "skillsense hook claude", statusMessage: "Checking capabilities" }] },
        ],
      },
    });
    const result = parseHooksJson(json);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("UserPromptSubmit");
    expect(result[0]?.type).toBe("hook");
    expect(result[0]?.description).toBe("Checking capabilities");
  });

  it("returns an empty array for invalid JSON", () => {
    expect(parseHooksJson("{not json")).toEqual([]);
  });
});
