"use client";
import { useEffect, useState } from "react";
import { File, FilePdf, FileImage, FileText, FileZip, FileXls, FileDoc, FilePpt, FileVideo, FileAudio, DownloadSimple, Trash, SpinnerGap } from "@phosphor-icons/react";
import type { Deliverable } from "@/lib/client-projects";
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
const formatSize = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} B`;
const iconFor = (name: string) => {
  const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "";
  return extension === "pdf" ? FilePdf
    : /^(png|jpe?g|gif|webp|svg|avif|heic)$/.test(extension) ? FileImage
    : /^(zip|rar|7z|gz)$/.test(extension) ? FileZip
    : /^(xlsx?|csv|ods)$/.test(extension) ? FileXls
    : /^(docx?|odt)$/.test(extension) ? FileDoc
    : /^(pptx?|odp)$/.test(extension) ? FilePpt
    : /^(mp4|mov|webm|avi)$/.test(extension) ? FileVideo
    : /^(mp3|wav|m4a|ogg)$/.test(extension) ? FileAudio
    : /^(txt|md|json)$/.test(extension) ? FileText : File;
};

type StoredFile = { name: string; url: string; size: number; author_role: string; created_at: string; deliverable_id: string | null };

function Attachment({ file, busy, deliverables, onDelete }: { file: StoredFile; busy: boolean; deliverables: Deliverable[]; onDelete: () => void }) {
  const Icon = iconFor(file.name);
  const pinned = file.deliverable_id ? deliverables.find(d => d.id === file.deliverable_id) : undefined;
  return <li className="project-attachment-row"><a className="project-attachment" href={file.url} download target="_blank" rel="noopener noreferrer">
    <span className="project-attachment-icon" aria-hidden="true"><Icon size={28} weight="duotone" /></span>
    <span className="project-attachment-name"><span>{file.name}</span><small>{fileType(file.name)}{file.size ? ` · ${formatSize(file.size)}` : ""}{file.created_at ? ` · ${new Date(file.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : ""}{pinned ? ` · ${pinned.title} v${pinned.version}` : ""}{file.author_role === "admin" ? " · enviado por Denis" : file.author_role === "client" ? " · enviado por você" : ""}</small></span>
    <DownloadSimple className="project-attachment-download" size={20} aria-hidden="true" />
  </a><Button type="button" size="icon" variant="outline" disabled={busy} aria-label={`Excluir arquivo ${file.name}`} title="Excluir arquivo" onClick={onDelete}><Trash size={20} aria-hidden="true" /></Button></li>;
}

export default function ProjectFiles({ projectId, deliverables = [] }: { projectId: string; deliverables?: Deliverable[] }) {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [pinned, setPinned] = useState("");
  async function load(signal?: AbortSignal) {
    const response = await fetch(`/api/workspace/files?project=${projectId}`, { signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setFiles(result.files);
  }
  useEffect(() => { const c = new AbortController(); void load(c.signal).catch(e => { if (!c.signal.aborted) setError(e.message); }); return () => c.abort(); }, [projectId]);
  function upload(form: HTMLFormElement) {
    return new Promise<void>((resolve, reject) => {
      // XHR reports upload progress; fetch does not.
      const payload = new FormData(form);
      payload.set("project", projectId);
      if (pinned) payload.set("deliverable", pinned); else payload.delete("deliverable");
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/workspace/files");
      xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        let result: { error?: string; saved?: boolean } = {};
        try { result = JSON.parse(xhr.responseText); } catch { /* Handled below. */ }
        if (xhr.status >= 200 && xhr.status < 300 && result.saved) resolve(); else reject(new Error(result.error || "Não foi possível enviar o arquivo."));
      };
      xhr.onerror = () => reject(new Error("Falha de conexão durante o envio. Tente novamente."));
      xhr.send(payload);
    });
  }
  return <Card><CardContent className="workspace-project-body project-files"><h3>Arquivos do projeto</h3><p>Inclua referências e materiais. Até 4 MB por arquivo: documentos, imagens, planilhas, apresentações, compactados, áudio e vídeo.</p>{error && <p role="alert">{error}</p>}<form onSubmit={async e => {
    e.preventDefault(); const form = e.currentTarget; setBusy(true); setError(""); setNotice(""); setProgress(0);
    try { await upload(form); form.reset(); setSelectedName(""); setPinned(""); await load(); setNotice("Arquivo enviado."); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar o arquivo."); } finally { setBusy(false); setProgress(null); }
  }}><label className="field">Selecionar arquivo<Input type="file" name="file" required disabled={busy} accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.avif,.heic,.zip,.rar,.7z,.gz,.xlsx,.xls,.csv,.ods,.docx,.doc,.odt,.pptx,.ppt,.odp,.txt,.md,.json,.mp4,.mov,.webm,.avi,.mp3,.wav,.m4a,.ogg" onChange={e => setSelectedName(e.target.files?.[0]?.name ?? "")} /></label>{selectedName && <p className="project-file-selection">Tipo selecionado: {fileType(selectedName)}</p>}{deliverables.length > 0 && <label className="field">Vincular a uma entrega (opcional)<select value={pinned} disabled={busy} onChange={e => setPinned(e.target.value)}><option value="">Arquivo do projeto (sem vínculo)</option>{deliverables.map(d => <option key={d.id} value={d.id}>{d.title} · v{d.version}</option>)}</select></label>}{progress !== null && <div className="upload-progress" role="progressbar" aria-label="Progresso do envio" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>}<Button disabled={busy} type="submit">{busy ? <><SpinnerGap className="prospect-spinner" /> Enviando{progress !== null ? ` ${progress}%` : "…"}</> : "Enviar arquivo"}</Button></form>
  {notice && <p role="status">{notice}</p>}
  {remove && <div className="workspace-notice" role="group" aria-label="Confirmar exclusão do arquivo"><strong>Excluir {remove.slice(37)}?</strong><p>O arquivo será removido para você e para os demais participantes do projeto. Esta ação não pode ser desfeita.</p><div className="workspace-actions"><Button variant="destructive" disabled={busy} onClick={async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/workspace/files", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project: projectId, name: remove }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setFiles(current => current.filter(file => file.name !== remove)); setRemove(null); setNotice("Arquivo excluído.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível excluir o arquivo."); } finally { setBusy(false); }
  }}>{busy ? "Excluindo…" : "Confirmar exclusão"}</Button><Button variant="outline" disabled={busy} onClick={() => setRemove(null)}>Cancelar</Button></div></div>}
  <ul aria-label="Arquivos anexados">{files.map(file => <Attachment key={file.name} file={file} busy={busy} deliverables={deliverables} onDelete={() => { setRemove(file.name); setError(""); setNotice(""); }} />)}</ul>{!files.length && !error && <p>Nenhum arquivo enviado.</p>}</CardContent></Card>;
}
