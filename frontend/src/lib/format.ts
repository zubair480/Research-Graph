export function formatFilename(filename: string): string {
  return filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
