"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";

export default function ProjectFiles({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load(signal?: AbortSignal) {
    const response = await fetch(`/api/workspace/files?project=${projectId}`, { signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setFiles(result.files);
  }
  useEffect(() => { const c = new AbortController(); void load(c.signal).catch(e => { if (!c.signal.aborted) setError(e.message); }); return () => c.abort(); }, [projectId]);
  return <Card><CardContent className="workspace-project-body project-files"><h3>Arquivos do projeto</h3><p>Inclua referências e materiais. Até 4 MB por arquivo.</p>{error && <p role="alert">{error}</p>}<form onSubmit={async e => {
    e.preventDefault(); const form = e.currentTarget; const payload = new FormData(form); payload.set("project", projectId); setBusy(true); setError("");
    try { const response = await fetch("/api/workspace/files", { method: "POST", body: payload }); const result = await response.json(); if (!response.ok) throw new Error(result.error); form.reset(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar o arquivo."); } finally { setBusy(false); }
  }}><label className="field">Selecionar arquivo<Input type="file" name="file" required disabled={busy} /></label><Button disabled={busy} type="submit">{busy ? "Enviando…" : "Enviar arquivo"}</Button></form><ul>{files.map(file => <li key={file.name}><a href={file.url} download target="_blank" rel="noopener noreferrer">{file.name.slice(37)}</a></li>)}</ul>{!files.length && !error && <p>Nenhum arquivo enviado.</p>}</CardContent></Card>;
}
