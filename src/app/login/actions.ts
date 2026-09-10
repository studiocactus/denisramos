"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(_previous: string, form: FormData) {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!email || !password) return "Informe seu e-mail e sua senha.";
  try {
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return "Não foi possível entrar. Confira o e-mail, a senha e a confirmação da conta.";
    const { data: admin, error: accessError } = await client.rpc("is_portfolio_admin");
    if (accessError || admin !== true) {
      await client.auth.signOut();
      return "Sua conta ainda não tem acesso administrativo. Conclua a liberação no Supabase.";
    }
  } catch { return "Não foi possível conectar. Tente novamente."; }
  redirect("/admin");
}

export async function logout() {
  const client = await createClient();
  await client.auth.signOut();
  redirect("/login");
}
