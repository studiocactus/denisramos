"use client";
import { useEffect, useState } from "react";
import { File, FilePdf, FileImage, FileText, FileZip, FileXls, FileDoc, FilePpt, FileVideo, FileAudio, DownloadSimple } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";

function Attachment({ file }: { file: { name: string; url: string } }) {
  const name = file.name.slice(37);
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const Icon = extension === "pdf" ? FilePdf
    : /^(png|jpe?g|gif|webp|svg|avif|heic)$/.test(extension) ? FileImage
    : /^(zip|rar|7z|gz)$/.test(extension) ? FileZip
    : /^(xlsx?|csv|ods)$/.test(extension) ? FileXls
    : /^(docx?|odt)$/.test(extension) ? FileDoc
    : /^(pptx?|odp)$/.test(extension) ? FilePpt
    : /^(mp4|mov|webm|avi)$/.test(extension) ? FileVideo
    : /^(mp3|wav|m4a|ogg)$/.test(extension) ? FileAudio
    : /^(txt|md|json)$/.test(extension) ? FileText : File;
  return <li><a className="project-attachment" href={file.url} download target="_blank" rel="noopener noreferrer">
    <span className="project-attachment-icon" aria-hidden="true"><Icon size={28} weight="duotone" /></span>
    <span className="project-attachment-name">{name}</span>
    <DownloadSimple className="project-attachment-download" size={20} aria-hidden="true" />
  </a></li>;
}

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
  }}><label className="field">Selecionar arquivo<Input type="file" name="file" required disabled={busy} /></label><Button disabled={busy} type="submit">{busy ? "Enviando…" : "Enviar arquivo"}</Button></form><ul aria-label="Arquivos anexados">{files.map(file => <Attachment key={file.name} file={file} />)}</ul>{!files.length && !error && <p>Nenhum arquivo enviado.</p>}</CardContent></Card>;
}
