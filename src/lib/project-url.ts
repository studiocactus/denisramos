export function normalizeProjectUrl(value: string): string {
  const input = value.trim();
  if (!input) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`;
  const url = new URL(candidate);
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password || /\s/.test(input)) {
    throw new Error("Informe um link válido, como gosafeviagens.com.br.");
  }
  return url.href;
}
