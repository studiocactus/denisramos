import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Anonymous content does not need session refresh or an auth network request.
  if (request.nextUrl.pathname === "/api/content" && request.method === "GET" && request.nextUrl.searchParams.get("admin") !== "1") return response;
  const config = supabaseConfig();
  if (!config) return response;
  const client = createServerClient(config.url, config.key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(values) {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  } });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/admin/:path*", "/login", "/cliente/:path*", "/auth/:path*", "/api/workspace/:path*", "/api/content/:path*"] };
