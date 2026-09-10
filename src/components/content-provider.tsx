"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { initialContent, type SiteContent } from "@/lib/content";
import { validContent } from "@/lib/validate-content";
const Context = createContext({content: initialContent, loading: true, error: "", saving: false, save: async (_: SiteContent) => {}});
export function ContentProvider({ children }: { children: ReactNode }) {
  const admin = usePathname().startsWith("/admin");
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
    fetch(admin ? "/api/content?admin=1" : "/api/content", { cache: "no-store", signal: controller.signal })
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
  }, [admin]);
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
  return <Context.Provider value={{ content: visible, save, loading: loading || loadedScope.current !== admin, error, saving }}>{children}</Context.Provider>;
}
export const useContent = () => useContext(Context);
