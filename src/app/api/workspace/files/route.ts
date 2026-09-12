import { createClient } from "@/lib/supabase/server";
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export async function GET(request: Request) {
  try {
    const client = await createClient();
    if (!(await client.auth.getUser()).data.user) return reply({ error: "Entre na sua conta." }, 401);
    const project = new URL(request.url).searchParams.get("project") ?? "";
    if (!validId(project)) return reply({ error: "Projeto inválido." }, 400);
    if (!(await client.from("workspace_projects").select("id").eq("id", project).maybeSingle()).data) return reply({ error: "Projeto não encontrado." }, 404);
    const bucket = client.storage.from("workspace-files");
    const listed = await bucket.list(project, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (listed.error) throw listed.error;
    const files = await Promise.all(listed.data.map(async file => {
      const signed = await bucket.createSignedUrl(`${project}/${file.name}`, 3600, { download: file.name.slice(37) });
      if (signed.error) throw signed.error;
      return { name: file.name, url: signed.data.signedUrl };
    }));
    return reply({ files });
  } catch { return reply({ error: "Não foi possível carregar os arquivos." }, 503); }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Origem não permitida." }, 403);
  try {
    const client = await createClient();
    if (!(await client.auth.getUser()).data.user) return reply({ error: "Entre na sua conta." }, 401);
    if (Number(request.headers.get("content-length")) > 4.5 * 1024 * 1024) return reply({ error: "O limite é 4 MB." }, 413);
    const data = await request.formData(), project = String(data.get("project") ?? ""), file = data.get("file");
    if (!validId(project) || !(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return reply({ error: "Selecione um arquivo de até 4 MB." }, 400);
    if (!(await client.from("workspace_projects").select("id").eq("id", project).maybeSingle()).data) return reply({ error: "Projeto não encontrado." }, 404);
    const name = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160) || "arquivo";
    const result = await client.storage.from("workspace-files").upload(`${project}/${crypto.randomUUID()}-${name}`, file, { contentType: "application/octet-stream", upsert: false });
    if (result.error) throw result.error;
    return reply({ saved: true });
  } catch { return reply({ error: "Não foi possível enviar o arquivo. Tente novamente." }, 503); }
}
