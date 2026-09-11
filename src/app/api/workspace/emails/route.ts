import { createClient } from "@/lib/supabase/server";
import { mailConfigured, sendWorkspaceEmails } from "@/lib/workspace-mailer";
export const maxDuration = 60;
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
async function adminClient() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const access = await client.rpc("is_portfolio_admin");
  return !access.error && access.data === true ? client : null;
}
export async function GET() {
  try {
    const client = await adminClient();
    if (!client) return respond({ error: "Acesso restrito ao administrador." }, 403);
    const result = await client.from("workspace_emails").select("id,kind,status,created_at,sent_at,last_error", { count: "exact" }).neq("status", "cancelled").order("created_at", { ascending: false }).limit(20);
    if (result.error) return respond({ error: "O histórico de e-mails ainda não está disponível." }, 503);
    return respond({ configured: mailConfigured(), emails: result.data });
  } catch { return respond({ error: "Não foi possível verificar os e-mails." }, 503); }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return respond({ error: "Origem não permitida." }, 403);
  try {
    const client = await adminClient();
    if (!client) return respond({ error: "Acesso restrito ao administrador." }, 403);
    return respond(await sendWorkspaceEmails(client));
  } catch { return respond({ error: "Não foi possível processar os e-mails. Tente novamente." }, 503); }
}
