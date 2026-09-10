import { createClient as createPublicClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { initialContent } from "@/lib/content";
import { validContent } from "@/lib/validate-content";
export const dynamic = "force-dynamic";
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function adminClient() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const access = await client.rpc("is_portfolio_admin");
  return !access.error && access.data === true ? client : null;
}
export async function GET(request: Request) {
  try {
    const config = supabaseConfig();
    if (!config) return respond({ error: "Conexão não configurada." }, 503);
    const admin = new URL(request.url).searchParams.get("admin") === "1";
    // Public pages always use an anonymous client, including when an admin is signed in.
    const client = admin ? await adminClient() : createPublicClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
    if (!client) return respond({ error: "Entre com sua conta administrativa." }, 401);
    const [settings, projects] = await Promise.all([
      client.from("site_settings").select("content,updated_at").eq("id", 1).maybeSingle(),
      client.from("portfolio_projects").select("slug,content,published").order("sort_order"),
    ]);
    if (settings.error || projects.error) return respond({ error: "Não foi possível carregar o portfólio." }, 502);
    if (!settings.data) return respond({ content: initialContent, version: null, initialized: false });
    const content = { ...settings.data.content, projects: projects.data.map(p => ({ ...p.content, slug: p.slug, published: p.published })) };
    if (!validContent(content)) return respond({ error: "O conteúdo salvo precisa ser revisado." }, 502);
    return respond({ content, version: settings.data.updated_at, initialized: true });
  } catch { return respond({ error: "Não foi possível conectar ao banco." }, 503); }
}
export async function PUT(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return respond({ error: "Origem não permitida." }, 403);
  try {
    const client = await adminClient();
    if (!client) return respond({ error: "Sua sessão expirou ou não tem acesso. Entre novamente." }, 401);
    const raw = await request.text();
    if (raw.length > 3500000) return respond({ error: "Conteúdo muito grande. Reduza as imagens." }, 413);
    const body = JSON.parse(raw);
    if (!validContent(body.content) || !(body.version === null || (typeof body.version === "string" && !Number.isNaN(Date.parse(body.version))))) return respond({ error: "Revise os campos antes de salvar." }, 400);
    const result = await client.rpc("save_portfolio", { payload: body.content, expected_version: body.version });
    if (result.error?.code === "40001") return respond({ error: "O conteúdo foi alterado em outra aba. Copie suas edições e recarregue antes de salvar." }, 409);
    if (result.error?.code === "PGRST202") return respond({ error: "Execute o segundo SQL no Supabase para ativar o salvamento." }, 503);
    if (result.error) return respond({ error: "Não foi possível salvar. Suas edições continuam na tela." }, 502);
    return respond({ version: result.data });
  } catch { return respond({ error: "Não foi possível salvar. Confira a conexão e tente novamente." }, 400); }
}
