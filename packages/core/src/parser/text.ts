export function extractHeadings(body: string): string[] {
  const headings: string[] = [];
  for (const line of body.split("\n")) {
    const match = /^#{1,6}\s+(.*)$/.exec(line.trim());
    if (match?.[1]) headings.push(match[1].trim());
  }
  return headings;
}

export function extractFirstParagraph(body: string): string | undefined {
  const lines = body.split("\n");
  const buffer: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      if (buffer.length > 0) break;
      continue;
    }
    if (line.startsWith("#")) continue;
    buffer.push(line);
  }
  return buffer.length > 0 ? buffer.join(" ").trim() : undefined;
}

/** Pulls bullet/quoted lines out of any section whose heading mentions "example". */
export function extractExamples(body: string): string[] {
  const lines = body.split("\n");
  const examples: string[] = [];
  let inExampleSection = false;
  for (const raw of lines) {
    const line = raw.trim();
    const headingMatch = /^#{1,6}\s+(.*)$/.exec(line);
    if (headingMatch) {
      inExampleSection = /example/i.test(headingMatch[1] ?? "");
      continue;
    }
    if (!inExampleSection || line === "") continue;
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    const quoted = /^["'“](.+)["'”]$/.exec(line);
    if (bulletMatch?.[1]) {
      examples.push(stripQuotes(bulletMatch[1]));
    } else if (quoted?.[1]) {
      examples.push(quoted[1]);
    } else {
      examples.push(line);
    }
  }
  return examples.filter(Boolean).slice(0, 10);
}

function stripQuotes(s: string): string {
  return s.replace(/^["'“]|["'”]$/g, "").trim();
}
