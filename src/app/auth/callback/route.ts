import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const client = await createClient();
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  let valid = false;
  if (code) valid = !(await client.auth.exchangeCodeForSession(code)).error;
  else if (token_hash && (type === "email" || type === "signup" || type === "recovery")) valid = !(await client.auth.verifyOtp({ token_hash, type })).error;
  const destination = valid ? (type === "recovery" || url.searchParams.get("next") === "reset" ? "/cliente/senha" : "/cliente") : "/cliente?access=expired";
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
