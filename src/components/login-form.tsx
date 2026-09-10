"use client";
import { useActionState } from "react";
import { login } from "@/app/login/actions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function LoginForm() {
  const [message, action, pending] = useActionState(login, "");
  return <form action={action} className="editor-form">
    <label className="field">E-mail<Input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
    <label className="field">Senha<Input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
    {message && <p role="alert">{message}</p>}
    <Button type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</Button>
  </form>;
}
