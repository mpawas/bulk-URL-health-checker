function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/""/g, '"').trim();
  }
  return trimmed;
}

function firstCell(line: string): string {
  return stripQuotes(line.split(",")[0] ?? "");
}

function looksLikeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** One URL per line. Optional header row (skipped when the first cell is not a URL). */
export function parseCsvUrls(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const start = looksLikeUrl(firstCell(lines[0] ?? "")) ? 0 : 1;
  const urls: string[] = [];

  for (const line of lines.slice(start)) {
    const cell = firstCell(line);
    if (cell.length > 0) {
      urls.push(cell);
    }
  }

  return urls;
}
