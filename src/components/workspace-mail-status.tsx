"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

type EmailStatus = { configured: boolean; emails: { id: string; kind: string; status: string; created_at: string; last_error: string | null }[] };
export default function WorkspaceMailStatus({ revision }: { revision: unknown }) {
  const [state, setState] = useState<EmailStatus | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/workspace/emails", { cache: "no-store", signal });
      if (!response.ok) return;
      setState(await response.json());
    } catch { /* Main workspace handles connection errors. */ }
  }
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(controller.signal); }, 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [revision]);
  if (!state) return null;
  const pending = state.emails.filter(e => ["pending", "sending", "failed"].includes(e.status)).length;
  return <details className="workspace-mail-status"><summary>E-mails aos clientes · {state.configured ? pending ? "Há envios pendentes" : "Envio configurado" : "Configuração pendente"}</summary>
    <p>{state.configured ? "Convites e mudanças de etapa geram e-mails automaticamente. Você pode acompanhar os últimos 20 envios aqui." : "Conecte o serviço de e-mail para enviar convites e atualizações. Os avisos ficam na fila enquanto a configuração é concluída."}</p>
    <Button variant="outline" disabled={!state.configured || busy} onClick={async () => {
      setBusy(true); setMessage("");
      try { const response = await fetch("/api/workspace/emails", { method: "POST" }); const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setMessage(result.configured ? `${result.sent} e-mail(s) enviado(s). ${result.failed ? `${result.failed} envio(s) precisam de revisão.` : ""}` : "Configure o serviço de envio primeiro."); await refresh();
      } catch (e) { setMessage(e instanceof Error ? e.message : "Não foi possível enviar."); } finally { setBusy(false); }
    }}>{busy ? "Enviando…" : "Processar envios pendentes"}</Button>
    {message && <p role="status">{message}</p>}
    <ul>{state.emails.map(email => <li key={email.id}>{email.kind === "invitation" ? "Convite" : "Atualização de etapa"} · {({ pending: "Na fila", sending: "Enviando", sent: "Aceito pelo serviço de envio", failed: "Falha no envio" } as Record<string, string>)[email.status]} · {new Date(email.created_at).toLocaleDateString("pt-BR")}{email.last_error && <small>{email.last_error}</small>}</li>)}</ul>
  </details>;
}
