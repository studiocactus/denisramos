import { createClient } from "@/lib/supabase/server";
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const missingTable = (code: string | undefined) => ["42P01", "42703", "PGRST204", "PGRST205", "PGRST202"].includes(code ?? "");
// Only everyday work formats are accepted; executables never reach Storage.
const allowed = /^(pdf|png|jpe?g|gif|webp|svg|avif|heic|zip|rar|7z|gz|xlsx?|csv|ods|docx?|odt|pptx?|odp|txt|md|json|mp4|mov|webm|avi|mp3|wav|m4a|ogg)$/i;
export async function GET(request: Request) {
  try {
    const client = await createClient();
    if (!(await client.auth.getUser()).data.user) return reply({ error: "Entre na sua conta." }, 401);
    const project = new URL(request.url).searchParams.get("project") ?? "";
    if (!validId(project)) return reply({ error: "Projeto inválido." }, 400);
    if (!(await client.from("workspace_projects").select("id").eq("id", project).maybeSingle()).data) return reply({ error: "Projeto não encontrado." }, 404);
    const bucket = client.storage.from("workspace-files");
    // The registry carries name, size, author and date; Storage alone cannot.
    const registered = await client.from("workspace_files").select("path,name,extension,size,author_role,created_at,deliverable_id").eq("project_id", project).order("created_at", { ascending: false });
    const files: { name: string; url: string; size: number; author_role: string; created_at: string; deliverable_id: string | null }[] = [];
    const known = new Set<string>();
    if (!missingTable(registered.error?.code) && !registered.error) {
      for (const row of registered.data ?? []) {
        known.add(row.path);
        const signed = await bucket.createSignedUrl(row.path, 3600, { download: row.name });
        if (signed.error) continue;
        files.push({ name: row.name, url: signed.data.signedUrl, size: row.size, author_role: row.author_role, created_at: row.created_at, deliverable_id: row.deliverable_id });
      }
    }
    // Files uploaded before the registry existed stay visible until removed.
    const listed = await bucket.list(project, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (listed.error) throw listed.error;
    for (const file of listed.data) {
      const path = `${project}/${file.name}`;
      if (known.has(path)) continue;
      const signed = await bucket.createSignedUrl(path, 3600, { download: file.name.slice(37) });
      if (signed.error) continue;
      const meta = file.metadata as { size?: number } | undefined;
      files.push({ name: file.name.slice(37), url: signed.data.signedUrl, size: meta?.size ?? 0, author_role: "", created_at: file.created_at ?? "", deliverable_id: null });
    }
    return reply({ files });
  } catch { return reply({ error: "Não foi possível carregar os arquivos." }, 503); }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Origem não permitida." }, 403);
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return reply({ error: "Entre na sua conta." }, 401);
    if (Number(request.headers.get("content-length")) > 4.5 * 1024 * 1024) return reply({ error: "O limite é 4 MB." }, 413);
    const data = await request.formData(), project = String(data.get("project") ?? ""), file = data.get("file");
    const deliverableId = String(data.get("deliverable") ?? "");
    if (!validId(project) || !(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) return reply({ error: "Selecione um arquivo de até 4 MB." }, 400);
    const name = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160) || "arquivo";
    const extension = (name.includes(".") ? name.split(".").pop() ?? "" : "").slice(0, 10).toLowerCase();
    if (!allowed.test(extension)) return reply({ error: "Formato não permitido. Use documentos, imagens, planilhas, apresentações, arquivos compactados, áudio ou vídeo." }, 400);
    if (!(await client.from("workspace_projects").select("id").eq("id", project).maybeSingle()).data) return reply({ error: "Projeto não encontrado." }, 404);
    if (deliverableId && !validId(deliverableId)) return reply({ error: "Entrega inválida." }, 400);
    if (deliverableId && !(await client.from("workspace_deliverables").select("id").eq("id", deliverableId).eq("project_id", project).maybeSingle()).data) return reply({ error: "Entrega não encontrada." }, 404);
    const path = `${project}/${crypto.randomUUID()}-${name}`;
    const result = await client.storage.from("workspace-files").upload(path, file, { contentType: "application/octet-stream", upsert: false });
    if (result.error) throw result.error;
    // The registry row records who sent what; failures never leave the file untracked silently.
    const access = await client.rpc("is_portfolio_admin");
    const registered = await client.from("workspace_files").insert({ project_id: project, path, name, extension, size: file.size, author_id: user.id, author_role: access.data === true ? "admin" : "client", ...(deliverableId ? { deliverable_id: deliverableId } : {}) });
    if (registered.error) {
      await client.storage.from("workspace-files").remove([path]).catch(() => {});
      if (missingTable(registered.error.code)) return reply({ error: "O registro de arquivos ainda precisa ser ativado no banco. Contate o administrador.", setupRequired: true }, 503);
      throw registered.error;
    }
    return reply({ saved: true, file: { name, url: (await client.storage.from("workspace-files").createSignedUrl(path, 3600, { download: name })).data?.signedUrl ?? "", size: file.size } });
  } catch { return reply({ error: "Não foi possível enviar o arquivo. Tente novamente." }, 503); }
}

export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Origem não permitida." }, 403);
  try {
    const client = await createClient();
    if (!(await client.auth.getUser()).data.user) return reply({ error: "Entre na sua conta." }, 401);
    if (Number(request.headers.get("content-length")) > 1024) return reply({ error: "Arquivo inválido." }, 400);
    const payload = await request.json().catch(() => null);
    const project = payload?.project, name = payload?.name;
    if (typeof project !== "string" || !validId(project) || typeof name !== "string" || !/^[0-9a-f-]{36}-[a-zA-Z0-9._-]{1,160}$/i.test(name) || !validId(name.slice(0, 36))) return reply({ error: "Arquivo inválido." }, 400);
    // The session's project RLS and storage DELETE policy both enforce ownership.
    const access = await client.from("workspace_projects").select("id").eq("id", project).maybeSingle();
    if (access.error) throw access.error;
    if (!access.data) return reply({ error: "Projeto não encontrado." }, 404);
    const result = await client.storage.from("workspace-files").remove([`${project}/${name}`]);
    if (result.error) throw result.error;
    if (result.data?.length !== 1) return reply({ error: "Arquivo não encontrado ou exclusão não permitida. Atualize a lista." }, 404);
    // Registry cleanup is best effort: RLS limits rows to project participants.
    try { await client.from("workspace_files").delete().eq("path", `${project}/${name}`); } catch { /* Storage removal already succeeded. */ }
    return reply({ deleted: true });
  } catch { return reply({ error: "Não foi possível excluir o arquivo. Tente novamente." }, 503); }
}
