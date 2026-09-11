import type { SiteContent } from "./content";
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max = 10000): value is string => typeof value === "string" && value.length <= max;
const list = (value: unknown, max: number, check: (item: Record<string, unknown>) => boolean) => Array.isArray(value) && value.length <= max && value.every(item => object(item) && check(item));
export function validContent(value: unknown): value is SiteContent {
  if (!object(value)) return false;
  const allowed = ["headline", "intro", "about", "email", "location", "clientLogos", "process", "personal", "socials", "projects"];
  return Object.keys(value).every(key => allowed.includes(key)) &&
    ["headline", "intro", "about", "email", "location"].every(key => text(value[key])) &&
    list(value.clientLogos, 20, p => text(p.name, 80) && text(p.src, 2500000) && /^data:image\/(png|jpeg);base64,[a-zA-Z0-9+/=]+$/.test(p.src)) &&
    list(value.process, 20, p => text(p.title, 200) && text(p.description)) &&
    list(value.personal, 30, p => text(p.label, 200) && text(p.value, 1000)) &&
    list(value.socials, 20, p => text(p.label, 200) && text(p.url, 2000) && (p.url === "" || /^https?:\/\//i.test(p.url))) &&
    list(value.projects, 200, p => ["slug", "title", "category", "year", "color", "description", "challenge", "solution"].every(key => text(p[key])) &&
      typeof p.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) && typeof p.published === "boolean" &&
      (p.tags === undefined || (Array.isArray(p.tags) && p.tags.length <= 30 && p.tags.every(t => text(t, 100)))) &&
      (p.images === undefined || list(p.images, 12, image => text(image.alt, 300) && text(image.src, 250000) && /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(image.src)))) &&
    new Set((value.projects as {slug: string}[]).map(p => p.slug)).size === (value.projects as unknown[]).length;
}
