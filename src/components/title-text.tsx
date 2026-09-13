/** Shared public heading treatment, including titles edited through the admin. */
export function TitleText({ text, highlight }: { text: string; highlight?: string | string[] }) {
  const title = text.trim().replace(/[.!?…]+$/, "");
  const requested = typeof highlight === "string" ? [highlight] : highlight ?? [];
  const accents = requested.filter(word => word && title.includes(word));
  if (!accents.length) accents.push(title.split(/\s+/).pop() ?? title);
  const pattern = new RegExp(`(${accents.filter(Boolean).sort((a, b) => b.length - a.length).map(word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).concat("\\.").join("|")})`, "g");
  return <span className="title-copy">{title.split(pattern).map((part, index) => part === "." ? <span key={index} className="title-dot">.</span> : accents.includes(part) ? <span key={index} className="title-highlight">{part}</span> : part)}<span className="title-dot">.</span></span>;
}
