import { createClient } from "@/lib/supabase/server";
import { parseWorkspaceMutation } from "@/lib/client-projects";
import { after } from "next/server";
import { sendWorkspaceEmails } from "@/lib/workspace-mailer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
function databaseError(code: string) {
  if (["42P01", "42703", "PGRST204", "PGRST205", "PGRST202"].includes(code)) return respond({ error: "A área de projetos ainda precisa ser ativada no banco. Contate o administrador.", setupRequired: true }, 503);
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
    let updates = projects.data.length ? await client.from("workspace_updates").select("id,project_id,body,author_role,created_at,reply_to").in("project_id", projects.data.map(p => p.id)).order("created_at", { ascending: false }).limit(500) : { data: [], error: null };
    if (updates.error?.code === "42703") updates = await client.from("workspace_updates").select("id,project_id,body,author_role,created_at").in("project_id", projects.data.map(p => p.id)).order("created_at", { ascending: false }).limit(500) as typeof updates;
    if (updates.error) return databaseError(updates.error.code);
    return respond({ clients: clients.data, projects: projects.data, updates: updates.data });
  } catch { return respond({ error: "Não foi possível carregar os projetos. Tente novamente." }, 503); }
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
    if (mutation.action !== "update" && mutation.action !== "profile" && !admin) return respond({ error: "Somente o administrador pode alterar clientes e projetos." }, 403);
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
    if (mutation.action === "update") {
      const result = await client.from("workspace_updates").insert({ project_id: mutation.project_id, body: mutation.body, ...(mutation.reply_to ? { reply_to: mutation.reply_to } : {}), author_id: user.id, author_role: admin ? "admin" : "client" });
      return result.error ? databaseError(result.error.code) : respond({ saved: true });
    }
    if (mutation.action === "profile") {
      if (!mutation.id) return respond({ error: "Cliente inválido." }, 400);
      const { email, ...profile } = mutation.values;
      const result = await client.from("workspace_clients").update(profile).eq("id", mutation.id).eq("email", (user.email ?? "").toLowerCase()).eq("updated_at", mutation.version).select("id").maybeSingle();
      return result.error ? databaseError(result.error.code) : result.data ? respond({ saved: true }) : respond({ error: "Cadastro alterado. Atualize e tente novamente." }, 409);
    }
    const table = mutation.action === "client" ? "workspace_clients" : "workspace_projects";
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
