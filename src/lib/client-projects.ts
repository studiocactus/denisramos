import { normalizeProjectUrl } from "./project-url";

export const deliveryStages = ["Briefing", "Design", "Desenvolvimento", "Em revisão", "Concluído"] as const;
export type Customer = { id: string; name: string; email: string; company: string; updated_at: string };
export type ClientProject = {
  id: string; client_id: string; title: string; description: string; stage: number;
  start_date: string | null; due_date: string | null; delivery_url: string; next_step: string; updated_at: string;
};
export type ProjectUpdate = { id: string; project_id: string; body: string; author_role: "admin" | "client"; created_at: string };
export type WorkspaceData = { clients: Customer[]; projects: ClientProject[]; updates: ProjectUpdate[] };

const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function text(value: unknown, max: number, required = false) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new Error("Confira os campos obrigatórios e o tamanho dos textos.");
  return value.trim();
}
function date(value: unknown): string | null {
  if (value === "" || value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error("Informe uma data válida.");
  return value;
}
export function parseWorkspaceMutation(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Dados inválidos.");
  const data = body as Record<string, unknown>;
  const id = data.id == null ? null : uuid(data.id) ? data.id : (() => { throw new Error("Registro inválido."); })();
  const version = id ? text(data.version, 60, true) : null;
  if (version && !Number.isFinite(Date.parse(version))) throw new Error("Versão inválida. Atualize o painel.");
  if (data.action === "client") {
    const email = text(data.email, 254, true).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
    return { action: "client" as const, id, version, values: { name: text(data.name, 120, true), email, company: text(data.company, 160) } };
  }
  if (data.action === "project") {
    if (!uuid(data.client_id)) throw new Error("Selecione o cliente do projeto.");
    if (!Number.isInteger(data.stage) || Number(data.stage) < 0 || Number(data.stage) >= deliveryStages.length) throw new Error("Selecione uma etapa válida.");
    const start_date = date(data.start_date), due_date = date(data.due_date);
    if (start_date && due_date && due_date < start_date) throw new Error("A previsão de entrega deve ser igual ou posterior ao início.");
    return { action: "project" as const, id, version, values: { client_id: data.client_id, title: text(data.title, 160, true), description: text(data.description, 3000), next_step: text(data.next_step, 1000), stage: Number(data.stage), start_date, due_date, delivery_url: normalizeProjectUrl(text(data.delivery_url, 2000)) } };
  }
  if (data.action === "update") {
    if (!uuid(data.project_id)) throw new Error("Selecione um projeto.");
    return { action: "update" as const, project_id: data.project_id, body: text(data.body, 3000, true) };
  }
  throw new Error("Ação inválida.");
}
