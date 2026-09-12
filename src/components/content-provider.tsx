"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { initialContent, type SiteContent } from "@/lib/content";
import { validContent } from "@/lib/validate-content";
import { loadContent } from "@/lib/load-content";
import PageLoading from "./page-loading";
const Context = createContext({content: initialContent, loading: true, error: "", saving: false, save: async (_: SiteContent) => {}});
export function ContentProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  const publicPage = pathname === "/" || pathname.startsWith("/projetos/");
  const [attempt, setAttempt] = useState(0);
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const version = useRef<string | null>(null);
  const busy = useRef(false);
  const loadedScope = useRef<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    loadedScope.current = null;
    setLoading(true); setError(""); setContent(initialContent);
    loadContent(admin, controller.signal)
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !validContent(data.content)) throw new Error(data.error || "Não foi possível carregar o conteúdo.");
        if (controller.signal.aborted) return;
        version.current = data.version;
        loadedScope.current = admin;
        setContent(data.content);
      })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [admin, attempt]);
  async function save(next: SiteContent) {
    if (!admin || loadedScope.current !== true || loading || error) throw new Error("Recarregue o painel antes de salvar.");
    if (busy.current) throw new Error("Aguarde o salvamento em andamento.");
    busy.current = true; setSaving(true);
    try {
      const response = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: next, version: version.current }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");
      version.current = data.version; setContent(next);
    } finally { busy.current = false; setSaving(false); }
  }
  // Never carry admin drafts into public pages during a client-side navigation.
  const visible = loadedScope.current === admin ? content : initialContent;
  const pending = !error && (loading || loadedScope.current !== admin);
  return <Context.Provider value={{ content: visible, save, loading: pending, error, saving }}>
    {publicPage && error ? <main className="public-content-error"><h1>Não foi possível carregar o portfólio.</h1><p>Confira sua conexão e tente novamente.</p><button type="button" onClick={() => { setError(""); setLoading(true); setAttempt(value => value + 1); }}>Tentar novamente</button></main>
      : publicPage && pending ? <PageLoading label={pathname === "/" ? "Carregando portfólio…" : "Carregando projeto…"} />
      : <>{children}{publicPage && <div key={pathname} className="page-arrival" aria-hidden="true" />}</>}
  </Context.Provider>;
}
export const useContent = () => useContext(Context);
