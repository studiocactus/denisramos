"use client";
import { useEffect, useState } from "react";
import { File, FilePdf, FileImage, FileText, FileZip, FileXls, FileDoc, FilePpt, FileVideo, FileAudio, DownloadSimple, Trash } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";

function fileType(name: string) {
  const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "";
  const category = extension === "pdf" ? "Documento PDF"
    : /^(png|jpe?g|gif|webp|svg|avif|heic)$/.test(extension) ? "Imagem"
    : /^(zip|rar|7z|gz)$/.test(extension) ? "Arquivo compactado"
    : /^(xlsx?|csv|ods)$/.test(extension) ? "Planilha"
    : /^(docx?|odt)$/.test(extension) ? "Documento de texto"
    : /^(pptx?|odp)$/.test(extension) ? "Apresentação"
    : /^(mp4|mov|webm|avi)$/.test(extension) ? "Vídeo"
    : /^(mp3|wav|m4a|ogg)$/.test(extension) ? "Áudio" : "Arquivo";
  return extension && extension !== "pdf" ? `${category} · ${extension.toUpperCase()}` : category;
}

function Attachment({ file, busy, onDelete }: { file: { name: string; url: string }; busy: boolean; onDelete: () => void }) {
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
  return <li className="project-attachment-row"><a className="project-attachment" href={file.url} download target="_blank" rel="noopener noreferrer">
    <span className="project-attachment-icon" aria-hidden="true"><Icon size={28} weight="duotone" /></span>
    <span className="project-attachment-name"><span>{name}</span><small>{fileType(name)}</small></span>
    <DownloadSimple className="project-attachment-download" size={20} aria-hidden="true" />
  </a><Button type="button" size="icon" variant="outline" disabled={busy} aria-label={`Excluir arquivo ${name}`} title="Excluir arquivo" onClick={onDelete}><Trash size={20} aria-hidden="true" /></Button></li>;
}

export default function ProjectFiles({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [selectedName, setSelectedName] = useState("");
  async function load(signal?: AbortSignal) {
    const response = await fetch(`/api/workspace/files?project=${projectId}`, { signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setFiles(result.files);
  }
  useEffect(() => { const c = new AbortController(); void load(c.signal).catch(e => { if (!c.signal.aborted) setError(e.message); }); return () => c.abort(); }, [projectId]);
  return <Card><CardContent className="workspace-project-body project-files"><h3>Arquivos do projeto</h3><p>Inclua referências e materiais. Até 4 MB por arquivo.</p>{error && <p role="alert">{error}</p>}<form onSubmit={async e => {
    e.preventDefault(); const form = e.currentTarget; const payload = new FormData(form); payload.set("project", projectId); setBusy(true); setError(""); setNotice("");
    try { const response = await fetch("/api/workspace/files", { method: "POST", body: payload }); const result = await response.json(); if (!response.ok) throw new Error(result.error); form.reset(); setSelectedName(""); await load(); setNotice("Arquivo enviado."); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar o arquivo."); } finally { setBusy(false); }
  }}><label className="field">Selecionar arquivo<Input type="file" name="file" required disabled={busy} onChange={e => setSelectedName(e.target.files?.[0]?.name ?? "")} /></label>{selectedName && <p className="project-file-selection">Tipo selecionado: {fileType(selectedName)}</p>}<Button disabled={busy} type="submit">{busy ? "Aguarde…" : "Enviar arquivo"}</Button></form>
  {notice && <p role="status">{notice}</p>}
  {remove && <div className="workspace-notice" role="group" aria-label="Confirmar exclusão do arquivo"><strong>Excluir {remove.slice(37)}?</strong><p>O arquivo será removido para você e para os demais participantes do projeto. Esta ação não pode ser desfeita.</p><div className="workspace-actions"><Button variant="destructive" disabled={busy} onClick={async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/workspace/files", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project: projectId, name: remove }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setFiles(current => current.filter(file => file.name !== remove)); setRemove(null); setNotice("Arquivo excluído.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível excluir o arquivo."); } finally { setBusy(false); }
  }}>{busy ? "Excluindo…" : "Confirmar exclusão"}</Button><Button variant="outline" disabled={busy} onClick={() => setRemove(null)}>Cancelar</Button></div></div>}
  <ul aria-label="Arquivos anexados">{files.map(file => <Attachment key={file.name} file={file} busy={busy} onDelete={() => { setRemove(file.name); setError(""); setNotice(""); }} />)}</ul>{!files.length && !error && <p>Nenhum arquivo enviado.</p>}</CardContent></Card>;
}
