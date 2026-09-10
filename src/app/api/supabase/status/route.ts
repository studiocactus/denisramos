import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export async function GET() {
  const respond = (body: unknown) => Response.json(body, { headers: { "Cache-Control": "no-store" } });
  const config = supabaseConfig();
  if (!config) return respond({ state: "not_configured" });
  try {
    const client = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(10000) }) },
    });
    const results = await Promise.all([
      client.from("site_settings").select("id").limit(0),
      client.from("portfolio_projects").select("slug").limit(0),
      client.rpc("is_portfolio_admin"),
    ]);
    const errors = results.map(result => result.error).filter(Boolean);
    if (errors.some(error => error && ["PGRST205", "PGRST202", "42P01", "42883"].includes(error.code))) return respond({ state: "schema_pending" });
    if (errors.length) return respond({ state: "connection_error" });
    return respond({ state: "schema_available" });
  } catch { return respond({ state: "connection_error" }); }
}
