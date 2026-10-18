import { createClient } from "@/lib/supabase/server";
import { parseWorkspaceMutation } from "@/lib/client-projects";
import { after } from "next/server";
import { sendWorkspaceEmails } from "@/lib/workspace-mailer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const missingTable = (code: string | undefined) => ["42P01", "42703", "PGRST204", "PGRST205", "PGRST202"].includes(code ?? "");
// Lets an optional query surface a full error response without abusing return types.
class ReplyError extends Error {
  reply: Response;
  constructor(reply: Response) { super("reply"); this.reply = reply; }
}
function databaseError(code: string | undefined) {
  if (missingTable(code)) return respond({ error: "A área de projetos ainda precisa ser ativada no banco. Contate o administrador.", setupRequired: true }, 503);
  if (code === "23505") return respond({ error: "Já existe um cliente com esse e-mail." }, 409);
  return respond({ error: "Não foi possível salvar. Confira os dados e tente novamente." }, 502);
}
export async function GET(request: Request) {
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return respond({ error: "Entre na sua conta para continuar." }, 401);
    const access = await client.rpc("is_portfolio_admin");
    if (access.error) return respond({ error: "Não foi possível verificar seu acesso." }, 503);
    const adminMode = new URL(request.url).searchParams.get("admin") === "1";
    if (adminMode && access.data !== true) return respond({ error: "Acesso restrito ao administrador." }, 403);
    const admin = access.data === true;
    // Admins use the management screen; the client endpoint never returns all clients to an admin preview.
    let clientsQuery = client.from("workspace_clients").select("*").order("name");
    if (!adminMode) clientsQuery = clientsQuery.eq("email", (user.email ?? "").toLowerCase());
    // After authorization, admin client and project lists can load concurrently.
    const [clients, adminProjects] = await Promise.all([
      clientsQuery,
      adminMode ? client.from("workspace_projects").select("*").order("updated_at", { ascending: false }) : Promise.resolve(null),
    ]);
    if (clients.error) return databaseError(clients.error.code);
    if (!clients.data.length) return respond({ clients: [], projects: [], updates: [] });
    const projects = adminProjects ?? await client.from("workspace_projects").select("*").in("client_id", clients.data.map(c => c.id)).order("updated_at", { ascending: false });
    if (projects.error) return databaseError(projects.error.code);
    let updates = projects.data.length ? await client.from("workspace_updates").select("id,project_id,body,author_role,created_at,reply_to,internal,deliverable_id").in("project_id", projects.data.map(p => p.id)).order("created_at", { ascending: false }).limit(500) : { data: [], error: null };
    if (missingTable(updates.error?.code)) updates = projects.data.length ? await client.from("workspace_updates").select("id,project_id,body,author_role,created_at,reply_to").in("project_id", projects.data.map(p => p.id)).order("created_at", { ascending: false }).limit(500) as typeof updates : updates;
    if (updates.error) return databaseError(updates.error.code);
    // Optional workspace features degrade with a clear flag until their
    // migration runs; the core conversation keeps working.
    const missingFeatures: string[] = [];
    const optional = async <T,>(query: PromiseLike<{ data: T | null; error: { code?: string } | null }>, feature: string, fallback: T): Promise<T> => {
      const result = await query;
      if (result.error) {
        // Missing schema degrades the feature; anything else stops the request.
        if (!missingTable(result.error.code)) throw new ReplyError(databaseError(result.error.code));
        missingFeatures.push(feature); return fallback;
      }
      return result.data ?? fallback;
    };
    const [tasks, deliverables, reads] = await Promise.all([
      optional(client.from("workspace_project_tasks").select("*").in("project_id", projects.data.map(p => p.id)).order("position").order("created_at"), "tasks", []),
      optional(client.from("workspace_deliverables").select("*").in("project_id", projects.data.map(p => p.id)).order("created_at", { ascending: false }), "deliverables", []),
      optional(client.from("workspace_message_reads").select("project_id,last_read").eq("reader_id", user.id), "unread", [] as { project_id: string; last_read: string }[]),
    ]);
    let opportunities: unknown[] = [];
    let clientNotes: Record<string, string> = {};
    if (adminMode) {
      opportunities = await optional(client.from("workspace_opportunities").select("*").order("updated_at", { ascending: false }), "opportunities", []);
      const notes = await optional(client.from("workspace_client_notes").select("client_id,body"), "clientNotes", []);
      clientNotes = Object.fromEntries((notes as { client_id: string; body: string }[]).map(n => [n.client_id, n.body]));
    }
    // Unread counts only messages from the other party after my own read position.
    const lastRead = new Map((reads as { project_id: string; last_read: string }[]).map(r => [r.project_id, r.last_read]));
    const unread: Record<string, number> = {};
    for (const update of updates.data) {
      if (update.internal && !admin) continue;
      if (update.author_role === (admin ? "admin" : "client")) continue;
      const position = lastRead.get(update.project_id);
      if (!position || update.created_at > position) unread[update.project_id] = (unread[update.project_id] ?? 0) + 1;
    }
    return respond({ clients: clients.data, projects: projects.data, updates: updates.data, tasks, deliverables, opportunities, clientNotes, unread, missingFeatures });
  } catch (e) {
    if (e instanceof ReplyError) return e.reply;
    return respond({ error: "Não foi possível carregar os projetos. Tente novamente." }, 503);
  }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return respond({ error: "Origem não permitida." }, 403);
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return respond({ error: "Sua sessão expirou. Entre novamente." }, 401);
    const raw = await request.text();
    if (raw.length > 16000) return respond({ error: "Texto muito grande." }, 413);
    let mutation;
    try { mutation = parseWorkspaceMutation(JSON.parse(raw)); }
    catch (e) { return respond({ error: e instanceof Error ? e.message : "Dados inválidos." }, 400); }
    const access = await client.rpc("is_portfolio_admin");
    if (access.error) return respond({ error: "Não foi possível verificar seu acesso." }, 503);
    const admin = access.data === true;
    const adminOnly = ["client", "project", "task", "deliverable", "deliverable_version", "delete_deliverable", "delete_task", "client_note", "opportunity", "delete_opportunity", "convert_opportunity", "archive_project", "delete_project"];
    if (!admin && adminOnly.includes(mutation.action)) return respond({ error: "Somente o administrador pode alterar clientes e projetos." }, 403);
    if (mutation.action === "mark_read") {
      // RLS restricts the position row to the reader; project access is checked here.
      const accessProject = await client.from("workspace_projects").select("id").eq("id", mutation.project_id).maybeSingle();
      if (accessProject.error) return databaseError(accessProject.error.code);
      if (!accessProject.data) return respond({ error: "Projeto não encontrado." }, 404);
      const result = await client.from("workspace_message_reads").upsert({ project_id: mutation.project_id, reader_id: user.id, last_read: new Date().toISOString() }, { onConflict: "project_id,reader_id" });
      return result.error ? databaseError(result.error.code) : respond({ saved: true });
    }
    if (mutation.action === "archive_project") {
      const result = await client.from("workspace_projects").update({ archived_at: mutation.archived ? new Date().toISOString() : null }).eq("id", mutation.id).eq("updated_at", mutation.version).select("id").maybeSingle();
      return result.error ? databaseError(result.error.code) : result.data ? respond({ saved: true }) : respond({ error: "O projeto mudou. Atualize o painel e tente novamente." }, 409);
    }
    if (mutation.action === "delete_project") {
      const result = await client.rpc("workspace_delete_project", { target: mutation.id, expected_version: mutation.version });
      return result.error ? databaseError(result.error.code) : result.data ? respond({ saved: true }) : respond({ error: "O projeto mudou ou já foi excluído. Atualize o painel e tente novamente." }, 409);
    }
    if (mutation.action === "edit_message" || mutation.action === "delete_message") {
      const result = mutation.action === "delete_message"
        ? await client.from("workspace_updates").delete().eq("id", mutation.id).select("id").maybeSingle()
        : await client.from("workspace_updates").update({ body: mutation.body }).eq("id", mutation.id).select("id").maybeSingle();
      return result.error ? databaseError(result.error.code) : result.data ? respond({ saved: true }) : respond({ error: "Mensagem não encontrada." }, 404);
    }
    if (mutation.action === "task_done") {
      // The database trigger allows a client to change only completion.
      const result = await client.from("workspace_project_tasks").update({ done: mutation.done }).eq("id", mutation.id).select("id").maybeSingle();
      return result.error ? databaseError(result.error.code) : result.data ? respond({ saved: true }) : respond({ error: "Tarefa não encontrada ou você não pode alterá-la." }, 404);
    }
    if (mutation.action === "delete_task") {
      const result = await client.from("workspace_project_tasks").delete().eq("id", mutation.id).select("id").maybeSingle();
      return result.error ? databaseError(result.error.code) : result.data ? respond({ saved: true }) : respond({ error: "Tarefa não encontrada." }, 404);
    }
    if (mutation.action === "delete_deliverable") {
      const result = await client.from("workspace_deliverables").delete().eq("id", mutation.id).select("id").maybeSingle();
      return result.error ? databaseError(result.error.code) : result.data ? respond({ saved: true }) : respond({ error: "Entrega não encontrada." }, 404);
    }
    if (mutation.action === "deliverable_version") {
      const previous = await client.from("workspace_deliverables").select("id,project_id,title,version").eq("id", mutation.id).maybeSingle();
      if (previous.error) return databaseError(previous.error.code);
      if (!previous.data) return respond({ error: "Entrega não encontrada." }, 404);
      const nextVersion = Math.min(previous.data.version + 1, 999);
      const result = await client.from("workspace_deliverables").insert({
        project_id: previous.data.project_id, title: mutation.values.title, description: mutation.values.description,
        preview_url: mutation.values.preview_url, version: nextVersion, supersedes: previous.data.id,
      }).select("id").single();
      if (result.error) return databaseError(result.error.code);
      // The queue is written by a definer function; failures keep the version live.
      const queued = await client.rpc("workspace_queue_approval_email", { target: previous.data.project_id, title: mutation.values.title, version: nextVersion });
      if (queued.error && !missingTable(queued.error.code)) return respond({ saved: true, id: result.data.id, notice: "Versão publicada, mas o aviso ao cliente não entrou na fila." });
      after(async () => { try { await sendWorkspaceEmails(client); } catch { /* Durable queue keeps the notice for retry. */ } });
      return respond({ saved: true, id: result.data.id });
    }
    if (mutation.action === "review_deliverable") {
      // The trigger records who approved and when; a comment can explain a request.
      const result = await client.from("workspace_deliverables").update({ status: mutation.status }).eq("id", mutation.id).select("id,project_id").maybeSingle();
      if (result.error) return databaseError(result.error.code);
      if (!result.data) return respond({ error: "Entrega não encontrada." }, 404);
      if (mutation.body) {
        const comment = await client.from("workspace_updates").insert({ project_id: result.data.project_id, body: mutation.body, deliverable_id: mutation.id, author_id: user.id, author_role: admin ? "admin" : "client" });
        if (comment.error) return databaseError(comment.error.code);
      }
      return respond({ saved: true });
    }
    if (mutation.action === "client_note") {
      const result = await client.from("workspace_client_notes").upsert({ client_id: mutation.id, body: mutation.body }, { onConflict: "client_id" }).select("client_id").maybeSingle();
      return result.error ? databaseError(result.error.code) : result.data ? respond({ saved: true }) : respond({ error: "Não foi possível salvar a anotação." }, 500);
    }
    if (mutation.action === "convert_opportunity") {
      const result = await client.rpc("workspace_convert_opportunity", { target: mutation.id, project_title: mutation.values.title, start: mutation.values.start_date, due: mutation.values.due_date });
      if (result.error) {
        if (result.error.message?.includes("e-mail")) return respond({ error: "Cadastre o e-mail da oportunidade antes de converter." }, 400);
        if (result.error.message?.includes("Lost")) return respond({ error: "Oportunidades perdidas não podem ser convertidas." }, 400);
        if (result.error.message?.includes("Already")) return respond({ error: "Esta oportunidade já foi convertida. O projeto existe na área do cliente." }, 409);
        return databaseError(result.error.code);
      }
      after(async () => { try { await sendWorkspaceEmails(client); } catch { /* Queue stays available. */ } });
      return respond({ saved: true, project_id: result.data });
    }
    if (mutation.action === "opportunity") {
      const result = mutation.id
        ? await client.from("workspace_opportunities").update(mutation.values).eq("id", mutation.id).eq("updated_at", mutation.version).select("id").maybeSingle()
        : await client.from("workspace_opportunities").insert(mutation.values).select("id").single();
      if (result.error) return databaseError(result.error.code);
      if (!result.data) return respond({ error: "Esta oportunidade mudou em outra sessão. Copie suas edições e atualize antes de salvar." }, 409);
      return respond({ saved: true, id: result.data.id });
    }
    if (mutation.action === "delete_opportunity") {
      const result = await client.from("workspace_opportunities").update({ deleted_at: new Date().toISOString() }).eq("id", mutation.id).eq("updated_at", mutation.version).select("id").maybeSingle();
      return result.error ? databaseError(result.error.code) : result.data ? respond({ saved: true }) : respond({ error: "Oportunidade não encontrada ou já excluída." }, 404);
    }
    if (mutation.action === "update") {
      // Internal notes are rejected for clients at the API and at RLS.
      if (mutation.internal && !admin) return respond({ error: "Notas internas são exclusivas do administrador." }, 403);
      const insert: Record<string, unknown> = { project_id: mutation.project_id, body: mutation.body, ...(mutation.reply_to ? { reply_to: mutation.reply_to } : {}), ...(mutation.deliverable_id ? { deliverable_id: mutation.deliverable_id } : {}), internal: mutation.internal, author_id: user.id, author_role: admin ? "admin" : "client" };
      const result = await client.from("workspace_updates").insert(insert);
      return result.error ? databaseError(result.error.code) : respond({ saved: true });
    }
    if (mutation.action === "profile") {
      if (!mutation.id) return respond({ error: "Cliente inválido." }, 400);
      const { email, ...profile } = mutation.values;
      const result = await client.from("workspace_clients").update(profile).eq("id", mutation.id).eq("email", (user.email ?? "").toLowerCase()).eq("updated_at", mutation.version).select("id").maybeSingle();
      return result.error ? databaseError(result.error.code) : result.data ? respond({ saved: true }) : respond({ error: "Cadastro alterado. Atualize e tente novamente." }, 409);
    }
    const table = mutation.action === "client" ? "workspace_clients" : mutation.action === "task" ? "workspace_project_tasks" : mutation.action === "deliverable" ? "workspace_deliverables" : "workspace_projects";
    const values = mutation.values;
    if (!values) return respond({ error: "Ação inválida." }, 400);
    const result = mutation.id
      ? await client.from(table).update(values).eq("id", mutation.id).eq("updated_at", mutation.version).select("id").maybeSingle()
      : await client.from(table).insert<typeof values>(values).select("id").single();
    if (result.error) return databaseError(result.error.code);
    if (!result.data) return respond({ error: "Este registro mudou em outra sessão. Copie suas edições e atualize antes de salvar." }, 409);
    after(async () => { try { await sendWorkspaceEmails(client); } catch { /* The durable queue remains available for retry. */ } });
    return respond({ saved: true, id: result.data.id });
  } catch { return respond({ error: "Não foi possível salvar. Tente novamente." }, 503); }
}
