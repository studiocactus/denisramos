import { normalizeProjectUrl } from "./project-url";

export const deliveryStages = ["Briefing", "Design", "Desenvolvimento", "Em revisão", "Concluído"] as const;
export type Customer = { id: string; name: string; email: string; company: string; phone?: string; project_contact?: string; additional_email?: string; address?: string; whatsapp?: string; updated_at: string };
export type ClientProject = {
  id: string; client_id: string; title: string; description: string; stage: number;
  start_date: string | null; due_date: string | null; delivery_url: string; next_step: string; updated_at: string; archived_at?: string | null;
};
export type ProjectUpdate = { id: string; project_id: string; body: string; author_role: "admin" | "client"; created_at: string; reply_to?: string | null };
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
  if (data.action === "edit_message" || data.action === "delete_message") { if (!id) throw new Error("Mensagem inválida."); return { action: data.action as "edit_message" | "delete_message", id, body: data.action === "edit_message" ? text(data.body, 3000, true) : "" }; }
  const version = id ? text(data.version, 60, true) : null;
  if (version && !Number.isFinite(Date.parse(version))) throw new Error("Versão inválida. Atualize o painel.");
  if (data.action === "delete_project") { if (!id) throw new Error("Projeto inválido."); return { action: "delete_project" as const, id, version }; }
  if (data.action === "archive_project") {
    if (!id || typeof data.archived !== "boolean") throw new Error("Projeto inválido.");
    return { action: "archive_project" as const, id, version, archived: data.archived };
  }
  if (data.action === "client" || data.action === "profile") {
    const email = text(data.email, 254, true).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
    const additionalEmail = text(data.additional_email ?? "", 254).toLowerCase();
    if (additionalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(additionalEmail)) throw new Error("Informe um e-mail adicional válido.");
    return { action: data.action as "client" | "profile", id, version, values: { name: text(data.name, 120, true), email, company: text(data.company, 160), phone: text(data.phone ?? "", 40), project_contact: text(data.project_contact ?? "", 120), additional_email: additionalEmail, address: text(data.address ?? "", 500), whatsapp: text(data.whatsapp ?? "", 40) } };
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
    return { action: "update" as const, project_id: data.project_id, reply_to: uuid(data.reply_to) ? data.reply_to : null, body: text(data.body, 3000, true) };
  }
  throw new Error("Ação inválida.");
}
