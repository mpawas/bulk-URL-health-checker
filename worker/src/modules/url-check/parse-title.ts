export function parsePageTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) {
    return null;
  }
  const title = match[1].replace(/\s+/g, " ").trim();
  return title.length > 0 ? title : null;
}
