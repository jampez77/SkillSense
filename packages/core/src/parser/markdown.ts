import path from "node:path";
import matter from "gray-matter";
import type { CapabilityType, Priority } from "../types.js";
import type { ParsedCapability } from "./types.js";
import { extractHeadings, extractFirstParagraph, extractExamples } from "./text.js";
import { extractKeywords } from "../matcher/tokenize.js";

function nameFromPath(absPath: string, isSkillFile: boolean): string {
  if (isSkillFile && path.basename(absPath).toLowerCase() === "skill.md") {
    return path.basename(path.dirname(absPath));
  }
  return path.basename(absPath, path.extname(absPath));
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string") return [value];
  return [];
}

function asPriority(value: unknown): Priority | undefined {
  return value === "low" || value === "normal" || value === "high" ? value : undefined;
}

export function parseMarkdownCapability(
  absPath: string,
  rawContent: string,
  defaultType: CapabilityType,
  isSkillFile: boolean,
): ParsedCapability {
  const { data: frontmatter, content: body } = matter(rawContent);
  const headings = extractHeadings(body);

  const name =
    typeof frontmatter.name === "string" && frontmatter.name.trim() !== ""
      ? frontmatter.name.trim()
      : nameFromPath(absPath, isSkillFile);

  const description =
    typeof frontmatter.description === "string" && frontmatter.description.trim() !== ""
      ? frontmatter.description.trim()
      : extractFirstParagraph(body);

  const tags = asStringArray(frontmatter.tags);
  const keywords =
    asStringArray(frontmatter.keywords).length > 0
      ? asStringArray(frontmatter.keywords)
      : extractKeywords(description ? [...headings, description] : headings, body);

  const examples = asStringArray(frontmatter.examples).length > 0
    ? asStringArray(frontmatter.examples)
    : extractExamples(body);

  const type: CapabilityType =
    typeof frontmatter.type === "string" ? (frontmatter.type as CapabilityType) : defaultType;

  return {
    name,
    type,
    description,
    tags,
    keywords,
    examples,
    rawFrontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : undefined,
    priority: asPriority(frontmatter.priority),
    enabled: frontmatter.enabled !== false,
  };
}
