/** Shared public heading treatment, including titles edited through the admin. */
export function TitleText({ text, highlight }: { text: string; highlight?: string }) {
  const title = text.trim().replace(/[.!?…]+$/, "");
  const accent = highlight && title.includes(highlight) ? highlight : title.split(/\s+/).pop() ?? title;
  const index = title.lastIndexOf(accent);
  return <span className="title-copy">{title.slice(0, index)}<span className="title-highlight">{accent}</span>{title.slice(index + accent.length)}<span className="title-dot">.</span></span>;
}
