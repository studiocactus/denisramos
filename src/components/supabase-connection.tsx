"use client";
import { useEffect, useState } from "react";
import { Database, ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const states: Record<string, { title: string; description: string }> = {
  loading: { title: "Verificando o Supabase…", description: "Conferindo a configuração e a estrutura inicial, sem consultar dados de clientes." },
  not_configured: { title: "Configuração pendente neste ambiente", description: "Cadastre a URL e a chave pública do Supabase nas variáveis da Vercel e publique novamente." },
  schema_pending: { title: "Estrutura inicial pendente", description: "Execute o SQL inicial no Supabase para criar as tabelas e as regras de acesso. O salvamento depende da estrutura do banco." },
  schema_available: { title: "Estrutura do Supabase disponível", description: "As tabelas e as regras de acesso estão disponíveis. O salvamento requer também a segunda migração do banco." },
  connection_error: { title: "Não foi possível validar a conexão", description: "Confira a URL, a chave pública e as permissões do projeto Supabase. Tente novamente após corrigir a configuração." },
};
export default function SupabaseConnection() {
  const [state, setState] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/supabase/status", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => setState(states[data.state] ? data.state : "connection_error"))
      .catch(() => { if (!controller.signal.aborted) setState("connection_error"); });
    return () => controller.abort();
  }, [attempt]);
  return <Card className="mt-6"><CardHeader><CardTitle className="flex items-center gap-2"><Database size={20} /> Conexão com o Supabase</CardTitle></CardHeader><CardContent><p role="status"><strong>{states[state].title}</strong></p><p className="muted">{states[state].description}</p><Button type="button" variant="outline" disabled={state === "loading"} onClick={() => { setState("loading"); setAttempt(value => value + 1); }}><ArrowClockwise /> Verificar novamente</Button></CardContent></Card>;
}
