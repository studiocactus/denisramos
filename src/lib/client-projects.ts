import { normalizeProjectUrl } from "./project-url";

export const deliveryStages = ["Briefing", "Design", "Desenvolvimento", "Em revisão", "Concluído"] as const;
export type Customer = { id: string; name: string; email: string; company: string; phone?: string; project_contact?: string; additional_email?: string; address?: string; whatsapp?: string; updated_at: string };
export type ClientProject = {
  id: string; client_id: string; title: string; description: string; stage: number;
  start_date: string | null; due_date: string | null; delivery_url: string; next_step: string; updated_at: string; archived_at?: string | null;
};
export type ProjectUpdate = { id: string; project_id: string; body: string; author_role: "admin" | "client"; created_at: string; reply_to?: string | null; internal?: boolean; deliverable_id?: string | null };
export type ProjectTask = { id: string; project_id: string; title: string; owner: "admin" | "client"; due_date: string | null; done: boolean; done_at: string | null; position: number; updated_at: string };
export type Deliverable = {
  id: string; project_id: string; title: string; description: string; preview_url: string;
  version: number; supersedes: string | null; status: "in_review" | "approved" | "changes_requested";
  approved_by: "admin" | "client" | null; approved_at: string | null; created_at: string; updated_at: string;
};
export const opportunityStages = [
  ["novo_contato", "Novo contato"], ["qualificacao", "Qualificação"], ["contato_realizado", "Contato realizado"],
  ["reuniao", "Reunião"], ["proposta_enviada", "Proposta enviada"], ["negociacao", "Negociação"],
  ["ganho", "Ganho"], ["perdido", "Perdido"],
] as const;
export type OpportunityStage = (typeof opportunityStages)[number][0];
export type Opportunity = {
  id: string; name: string; company: string; email: string; phone: string; source: string;
  service_interest: string; need: string; stage: OpportunityStage;
  estimated_value: string | null; proposal_value: string | null; lost_reason: string;
  notes: string; next_action: string; next_action_date: string | null;
  client_id: string | null; project_id: string | null; converted_at: string | null; created_at: string; updated_at: string;
};
export type WorkspaceData = {
  clients: Customer[]; projects: ClientProject[]; updates: ProjectUpdate[];
  tasks?: ProjectTask[]; deliverables?: Deliverable[]; opportunities?: Opportunity[];
  clientNotes?: Record<string, string>; unread?: Record<string, number>; missingFeatures?: string[];
};

const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function text(value: unknown, max: number, required = false) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new Error("Confira os campos obrigatórios e o tamanho dos textos.");
  return value.trim();
}
function optionalText(value: unknown, max: number) { return text(value ?? "", max); }
function date(value: unknown): string | null {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error("Informe uma data válida.");
  return value;
}
function money(value: unknown): string | null {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^\d{1,10}(?:\.\d{1,2})?$/.test(value) || Number(value) < 0) throw new Error("Informe um valor válido, usando ponto como separador decimal.");
  return value;
}
function version(value: unknown): string {
  const raw = text(value, 60, true);
  if (!Number.isFinite(Date.parse(raw))) throw new Error("Versão inválida. Atualize o painel.");
  return raw;
}
export function parseWorkspaceMutation(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Dados inválidos.");
  const data = body as Record<string, unknown>;
  const id = data.id == null ? null : uuid(data.id) ? data.id : (() => { throw new Error("Registro inválido."); })();
  if (data.action === "edit_message" || data.action === "delete_message") { if (!id) throw new Error("Mensagem inválida."); return { action: data.action as "edit_message" | "delete_message", id, body: data.action === "edit_message" ? text(data.body, 3000, true) : "" }; }
  if (data.action === "mark_read") { if (!uuid(data.project_id)) throw new Error("Projeto inválido."); return { action: "mark_read" as const, project_id: data.project_id as string }; }
  if (data.action === "task_done") { if (!id) throw new Error("Tarefa inválida."); if (typeof data.done !== "boolean") throw new Error("Tarefa inválida."); return { action: "task_done" as const, id, done: data.done }; }
  if (data.action === "review_deliverable") {
    if (!id) throw new Error("Entrega inválida.");
    if (data.status !== "approved" && data.status !== "changes_requested") throw new Error("Selecione uma decisão válida.");
    return { action: "review_deliverable" as const, id, status: data.status as "approved" | "changes_requested", body: optionalText(data.body, 3000) };
  }
  // Version conflicts only matter for guarded records; other actions stay free.
  const guarded = () => ({ id, version: version(data.version) });
  if (data.action === "delete_project") { if (!id) throw new Error("Projeto inválido."); return { action: "delete_project" as const, id, version: guarded().version }; }
  if (data.action === "delete_task") { if (!id) throw new Error("Tarefa inválida."); return { action: "delete_task" as const, id }; }
  if (data.action === "delete_deliverable") { if (!id) throw new Error("Entrega inválida."); return { action: "delete_deliverable" as const, id }; }
  if (data.action === "delete_opportunity") { if (!id) throw new Error("Oportunidade inválida."); return { action: "delete_opportunity" as const, id, version: guarded().version }; }
  if (data.action === "archive_project") {
    if (!id || typeof data.archived !== "boolean") throw new Error("Projeto inválido.");
    return { action: "archive_project" as const, id, version: guarded().version, archived: data.archived };
  }
  if (data.action === "client" || data.action === "profile") {
    const email = text(data.email, 254, true).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
    const additionalEmail = text(data.additional_email ?? "", 254).toLowerCase();
    if (additionalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(additionalEmail)) throw new Error("Informe um e-mail adicional válido.");
    return { action: data.action as "client" | "profile", id, version: id ? guarded().version : null, values: { name: text(data.name, 120, true), email, company: text(data.company, 160), phone: text(data.phone ?? "", 40), project_contact: text(data.project_contact ?? "", 120), additional_email: additionalEmail, address: text(data.address ?? "", 500), whatsapp: text(data.whatsapp ?? "", 40) } };
  }
  if (data.action === "client_note") {
    if (!id) throw new Error("Cliente inválido.");
    return { action: "client_note" as const, id, version: null, body: text(data.body ?? "", 5000) };
  }
  if (data.action === "project") {
    if (!uuid(data.client_id)) throw new Error("Selecione o cliente do projeto.");
    if (!Number.isInteger(data.stage) || Number(data.stage) < 0 || Number(data.stage) >= deliveryStages.length) throw new Error("Selecione uma etapa válida.");
    const start_date = date(data.start_date), due_date = date(data.due_date);
    if (start_date && due_date && due_date < start_date) throw new Error("A previsão de entrega deve ser igual ou posterior ao início.");
    return { action: "project" as const, id, version: id ? guarded().version : null, values: { client_id: data.client_id, title: text(data.title, 160, true), description: text(data.description, 3000), next_step: text(data.next_step, 1000), stage: Number(data.stage), start_date, due_date, delivery_url: normalizeProjectUrl(text(data.delivery_url, 2000)) } };
  }
  if (data.action === "task") {
    if (!uuid(data.project_id)) throw new Error("Selecione um projeto.");
    if (data.owner !== "admin" && data.owner !== "client") throw new Error("Selecione um responsável.");
    const due_date = date(data.due_date);
    const position = data.position === undefined ? 0 : Number(data.position);
    if (!Number.isInteger(position) || position < 0 || position > 9999) throw new Error("Posição inválida.");
    return { action: "task" as const, id, version: id ? guarded().version : null, values: { project_id: data.project_id, title: text(data.title, 200, true), owner: data.owner, due_date, done: data.done === true, position } };
  }
  if (data.action === "deliverable") {
    if (!uuid(data.project_id)) throw new Error("Selecione um projeto.");
    return { action: "deliverable" as const, id, version: id ? guarded().version : null, values: { project_id: data.project_id, title: text(data.title, 160, true), description: text(data.description ?? "", 3000), preview_url: normalizeProjectUrl(text(data.preview_url ?? "", 2000)) } };
  }
  if (data.action === "deliverable_version") {
    // A new version supersedes the previous one and always restarts review.
    if (!id) throw new Error("Entrega inválida.");
    return { action: "deliverable_version" as const, id, version: guarded().version, values: { title: text(data.title, 160, true), description: text(data.description ?? "", 3000), preview_url: normalizeProjectUrl(text(data.preview_url ?? "", 2000)) } };
  }
  if (data.action === "opportunity") {
    const email = text(data.email ?? "", 254).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
    const stage = data.stage ?? "novo_contato";
    if (!opportunityStages.some(([value]) => value === stage)) throw new Error("Selecione uma etapa válida.");
    const lost_reason = text(data.lost_reason ?? "", 500);
    if (stage === "perdido" && !lost_reason) throw new Error("Informe o motivo da perda.");
    const next_action_date = date(data.next_action_date);
    return { action: "opportunity" as const, id, version: id ? guarded().version : null, values: { name: text(data.name, 120, true), company: optionalText(data.company, 160), email, phone: optionalText(data.phone, 40), source: optionalText(data.source, 120), service_interest: optionalText(data.service_interest, 160), need: optionalText(data.need, 3000), stage: stage as OpportunityStage, estimated_value: money(data.estimated_value), proposal_value: money(data.proposal_value), lost_reason, notes: optionalText(data.notes, 3000), next_action: optionalText(data.next_action, 300), next_action_date } };
  }
  if (data.action === "convert_opportunity") {
    if (!id) throw new Error("Oportunidade inválida.");
    const start_date = date(data.start_date), due_date = date(data.due_date);
    if (start_date && due_date && due_date < start_date) throw new Error("A previsão de entrega deve ser igual ou posterior ao início.");
    return { action: "convert_opportunity" as const, id, values: { title: text(data.title, 160, true), start_date, due_date } };
  }
  if (data.action === "update") {
    if (!uuid(data.project_id)) throw new Error("Selecione um projeto.");
    const internal = data.internal === true;
    const deliverable_id = uuid(data.deliverable_id) ? data.deliverable_id as string : null;
    return { action: "update" as const, project_id: data.project_id, reply_to: uuid(data.reply_to) ? data.reply_to as string : null, body: text(data.body, 3000, true), internal, deliverable_id };
  }
  throw new Error("Ação inválida.");
}

export type WorkspaceMutation = ReturnType<typeof parseWorkspaceMutation>;

/**
 * Explicit progress rule shared by the admin and the client portal:
 * the average of three observable criteria, each reported alongside the value —
 * stage position, share of completed tasks and share of approved deliverables.
 * Criteria without data are skipped, never counted as 100%.
 */
export function projectProgress(project: Pick<ClientProject, "stage">, tasks: Pick<ProjectTask, "done">[], deliverables: Pick<Deliverable, "status">[]) {
  const criteria: number[] = [project.stage / (deliveryStages.length - 1)];
  const labels = [`Etapa ${project.stage + 1} de ${deliveryStages.length}`];
  if (tasks.length) { criteria.push(tasks.filter(t => t.done).length / tasks.length); labels.push(`${tasks.filter(t => t.done).length} de ${tasks.length} tarefas concluídas`); }
  if (deliverables.length) { criteria.push(deliverables.filter(d => d.status === "approved").length / deliverables.length); labels.push(`${deliverables.filter(d => d.status === "approved").length} de ${deliverables.length} entregas aprovadas`); }
  return { percent: Math.round((criteria.reduce((a, b) => a + b, 0) / criteria.length) * 100), labels };
}
