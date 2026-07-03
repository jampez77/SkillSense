import path from "node:path";
import type { CapabilityType } from "../types.js";
import type { ParsedCapability } from "./types.js";
import { extractHeadings, extractFirstParagraph } from "./text.js";
import { extractKeywords } from "../matcher/tokenize.js";

export function parseInstructionFile(
  absPath: string,
  rawContent: string,
  defaultType: CapabilityType,
): ParsedCapability {
  const headings = extractHeadings(rawContent);
  const name = path.basename(absPath, path.extname(absPath));
  const description = headings[0] ?? extractFirstParagraph(rawContent);
  const keywords = extractKeywords(headings, rawContent, 20);

  return {
    name,
    type: defaultType,
    description,
    tags: [],
    keywords,
    examples: [],
    enabled: true,
  };
}
