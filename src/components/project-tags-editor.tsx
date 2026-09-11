"use client";

import { useId, useState } from "react";
import { Input } from "./ui/input";

export default function ProjectTagsEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function addTag() {
    const tag = draft.trim();
    if (!tag) { setDraft(""); return; }
    if (tags.some(existing => existing.trim().toLocaleLowerCase() === tag.toLocaleLowerCase())) {
      setError("Essa tag já foi adicionada.");
      return;
    }
    if (tags.length >= 30) { setError("Você pode adicionar até 30 tags."); return; }
    onChange([...tags, tag]);
    setDraft("");
    setError("");
  }

  return <div className="field">
    <label htmlFor={id}>Tags do trabalho</label>
    {tags.length > 0 && <ul className="tag-editor-list" aria-label="Tags adicionadas">
      {tags.map((tag, index) => <li key={`${index}-${tag}`}>
        <span>{tag}</span>
        <button type="button" aria-label={`Remover tag ${tag}`} onClick={() => {
          onChange(tags.filter((_, position) => position !== index));
          setError("");
        }}>×</button>
      </li>)}
    </ul>}
    <Input id={id} maxLength={100} placeholder="Digite uma tag e pressione Enter"
      value={draft} aria-describedby={`${id}-help`} aria-invalid={!!error}
      onChange={event => { setDraft(event.target.value); setError(""); }}
      onKeyDown={event => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          addTag();
        }
      }} />
    <small id={`${id}-help`}>Enter adiciona a tag. Use × para remover.</small>
    {error && <small role="alert">{error}</small>}
  </div>;
}
