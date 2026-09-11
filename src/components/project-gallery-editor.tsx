"use client";
import { useState } from "react";
import type { Project } from "@/lib/content";

type ImageItem = NonNullable<Project["images"]>[number];
async function prepare(file: File): Promise<ImageItem> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) throw new Error("Use JPG, PNG ou WebP de até 15 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    let scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 8; attempt++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Não foi possível preparar a imagem.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const src = canvas.toDataURL("image/webp", .85);
      if (src.length <= 240000) return { src, alt: "" };
      scale *= .8;
    }
    throw new Error("Esta imagem é muito grande. Reduza suas dimensões e tente novamente.");
  } finally { bitmap.close(); }
}
export default function ProjectGalleryEditor({ images, onChange, onBusyChange, cover = false, disabled = false }: { images: ImageItem[]; onChange: (images: ImageItem[]) => void; onBusyChange: (busy: boolean) => void; cover?: boolean; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function move(index: number, direction: number) {
    const next = [...images];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  }
  return <fieldset className="gallery-editor" disabled={busy || disabled}>
    <legend>{cover ? "Capa da landing page" : "Galeria da página interna"}</legend>
    <p>{cover ? "Esta imagem aparece no card da home, nos projetos relacionados e na abertura do projeto. Prefira uma imagem horizontal. Sem imagem, será usada a capa conceitual." : "Adicione até 12 imagens para a página interna. Elas serão otimizadas e exibidas nesta ordem, uma abaixo da outra."} Clique em Salvar projeto para publicar.</p>
    <label className="field">{cover ? "Selecionar ou substituir capa" : "Adicionar imagens"}<input type="file" accept="image/jpeg,image/png,image/webp" multiple={!cover} onChange={async event => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      setError("");
      if (!files.length) return;
      if (!cover && images.length + files.length > 12) { setError("Use no máximo 12 imagens por projeto."); return; }
      setBusy(true);
      onBusyChange(true);
      try { const added = []; for (const file of files) added.push(await prepare(file)); onChange(cover ? added.slice(0, 1) : [...images, ...added]); }
      catch (e) { setError(e instanceof Error ? e.message : "Não foi possível adicionar as imagens."); }
      finally { setBusy(false); onBusyChange(false); }
    }} /></label>
    {busy && <p role="status">Preparando imagens…</p>}
    {error && <p role="alert">{error}</p>}
    {images.map((image, index) => <div className="gallery-editor-item" key={index}>
      <img src={image.src} alt={`Prévia ${index + 1}`} />
      <label className="field">Descrição da imagem {index + 1}<input maxLength={300} value={image.alt} onChange={event => onChange(images.map((item, i) => i === index ? { ...item, alt: event.target.value } : item))} /></label>
      <div>{!cover && <><button type="button" disabled={index === 0} onClick={() => move(index, -1)}>Subir</button><button type="button" disabled={index === images.length - 1} onClick={() => move(index, 1)}>Descer</button></>}<button type="button" onClick={() => onChange(images.filter((_, i) => i !== index))}>Remover</button></div>
    </div>)}
  </fieldset>;
}
