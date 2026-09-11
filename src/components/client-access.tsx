"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function ClientAccess({ reset = false }: { reset?: boolean }) {
  const [mode, setMode] = useState<"login" | "signup" | "recover" | "reset">(reset ? "reset" : "login");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    try {
      const client = createClient();
      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Confira o e-mail, a senha e a confirmação da sua conta.");
        window.location.assign("/cliente"); return;
      }
      if (mode === "signup") {
        const { error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
        if (error) {
          if ((error.status ?? 0) >= 500) throw new Error("Não foi possível concluir o cadastro porque o serviço de confirmação está indisponível. O responsável precisa verificar o envio de e-mails antes de você tentar novamente.");
          if (error.status === 429) throw new Error("Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.");
          if (error.code === "weak_password") throw new Error("A senha não atende aos requisitos de segurança. Use uma senha mais forte com letras, números e símbolos.");
          if (error.code === "signup_disabled") throw new Error("O cadastro de novas contas está desativado. Peça ao responsável para liberar seu acesso.");
          throw new Error("Não foi possível criar o acesso. Confira os dados ou tente recuperar sua senha se já tiver uma conta.");
        }
        setMessage("Confira seu e-mail para confirmar o acesso. Depois, entre com o e-mail e a senha escolhida.");
      }
      if (mode === "recover") {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=reset` });
        if (error) throw new Error("Não foi possível solicitar a recuperação. Aguarde e tente novamente.");
        setMessage("Se houver uma conta com esse e-mail, você receberá as instruções para redefinir a senha.");
      }
      if (mode === "reset") {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw new Error("Não foi possível alterar a senha. Solicite um novo link de recuperação.");
        window.location.assign("/cliente"); return;
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : "Não foi possível conectar. Tente novamente."); }
    finally { setPending(false); }
  }
  return <main className="login-page"><section className="login-card client-access">
    <Link href="/" aria-label="Voltar ao site"><img src="/simbolo.svg" width={48} height={48} alt="Denis Ramos" /></Link>
    <p className="eyebrow">ESPAÇO DO CLIENTE</p><h1>{mode === "login" ? "Seus projetos, de perto." : mode === "signup" ? "Crie seu acesso." : mode === "recover" ? "Recupere sua senha." : "Escolha uma nova senha."}</h1>
    <p>{mode === "signup" ? "Use o mesmo e-mail informado ao responsável pelos seus projetos." : "Acompanhe as etapas, as entregas e converse sobre os próximos passos."}</p>
    <form className="editor-form" onSubmit={submit}>
      {mode !== "reset" && <label className="field">E-mail<Input type="email" name="email" autoComplete="username" required maxLength={254} /></label>}
      {mode !== "recover" && <label className="field">Senha<Input type="password" name="password" required minLength={mode === "login" ? 1 : 8} maxLength={256} autoComplete={mode === "login" ? "current-password" : "new-password"} />{mode !== "login" && <small>Use pelo menos 8 caracteres.</small>}</label>}
      {message && <p role="status">{message}</p>}
      <Button disabled={pending} type="submit">{pending ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar acesso" : mode === "recover" ? "Enviar instruções" : "Salvar nova senha"}</Button>
    </form>
    <div className="client-access-options">{mode === "login" ? <><button disabled={pending} onClick={() => { setMode("signup"); setMessage(""); }}>Primeiro acesso</button><button disabled={pending} onClick={() => { setMode("recover"); setMessage(""); }}>Esqueci minha senha</button></> : <button disabled={pending} onClick={() => { setMode("login"); setMessage(""); }}>Voltar para entrar</button>}</div>
    <Link href="/">Voltar ao site</Link>
  </section></main>;
}
