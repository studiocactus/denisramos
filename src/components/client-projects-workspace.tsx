"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowClockwise, ArrowUpRight, Briefcase, CalendarBlank, CheckCircle, ChatsCircle, Plus, User, PencilSimple } from "@phosphor-icons/react";
import { deliveryStages, type Customer, type ClientProject, type WorkspaceData } from "@/lib/client-projects";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import WorkspaceMailStatus from "./workspace-mail-status";

const empty: WorkspaceData = { clients: [], projects: [], updates: [] };
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "medium" }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : "A definir";
type Editor = { kind: "client"; value?: Customer } | { kind: "project"; value?: ClientProject };

export default function ClientProjectsWorkspace({ admin = false }: { admin?: boolean }) {
  const [data, setData] = useState<WorkspaceData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [comment, setComment] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/workspace${admin ? "?admin=1" : ""}`, { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok) { setSetup(!!result.setupRequired); throw new Error(result.error); }
      setData(result); setSetup(false); setError("");
      return true;
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : "Não foi possível carregar os projetos.");
      return false;
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [admin]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  // Refresh the read-only client view; never overwrite an admin's open form.
  useEffect(() => {
    if (admin) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    return () => clearInterval(timer);
  }, [admin, load]);

  async function save(payload: Record<string, unknown>) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const refreshed = await load();
      setNotice(refreshed ? "Alterações salvas." : "Salvo. Atualize o painel para carregar a versão mais recente.");
      if (payload.action === "client" && result.id) setClientId(result.id);
      if (payload.action === "project" && result.id) { setProjectId(result.id); setClientId(String(payload.client_id)); setFilter("all"); setSearch(""); }
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); return false; }
    finally { setBusy(false); }
  }

  const currentClient = data.clients.find(c => c.id === clientId) ?? data.clients[0];
  const projects = data.projects.filter(p => p.client_id === currentClient?.id);
  const visibleProjects = projects.filter(p => p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (filter === "all" || (filter === "done" ? p.stage === 4 : p.stage !== 4)));
  const selected = visibleProjects.find(p => p.id === projectId) ?? visibleProjects[0];
  const history = data.updates.filter(u => u.project_id === selected?.id);

  if (loading) return <p role="status" className="workspace-empty">Carregando clientes e projetos…</p>;
  return <section className="client-workspace" aria-label={admin ? "Gestão de clientes e projetos" : "Meus projetos"}>
    {error && <div className="workspace-notice" role="alert"><p>{error}</p>{setup && admin && <p>Execute a migração <code>202609110001_client_workspace.sql</code> no Supabase para ativar esta área.</p>}<Button variant="outline" disabled={busy} onClick={() => void load()}><ArrowClockwise /> Tentar novamente</Button></div>}
    {notice && <p className="workspace-notice" role="status">{notice}</p>}
    {admin && <WorkspaceMailStatus revision={data} />}
    <div className="workspace-toolbar">
      <div><h2>{admin ? "Clientes e projetos" : `Olá${currentClient ? `, ${currentClient.name}` : ""}.`}</h2><p>{admin ? "Organize as entregas e mantenha cada cliente por dentro." : "Acompanhe o andamento, os próximos passos e as entregas."}</p></div>
      <div className="workspace-actions">
        <Button variant="outline" disabled={busy} onClick={() => void load()} aria-label="Atualizar projetos"><ArrowClockwise /></Button>
        {admin && <><Button variant="outline" disabled={busy || setup} onClick={() => { setError(""); setEditor({ kind: "client" }); }}><User /> Novo cliente</Button><Button disabled={busy || setup || !data.clients.length} onClick={() => { setError(""); setEditor({ kind: "project" }); }}><Plus /> Novo projeto</Button></>}
      </div>
    </div>
    {editor && <WorkspaceEditor key={`${editor.kind}-${editor.value?.id ?? "new"}`} editor={editor} clients={data.clients} clientId={currentClient?.id ?? ""} busy={busy} onCancel={() => setEditor(null)} onSave={async payload => { if (await save(payload)) setEditor(null); }} />}
    {!data.clients.length ? <Card><CardContent className="workspace-empty"><User size={40} /><h3>{admin ? "Seu primeiro cliente começa aqui" : "Seu acesso está pronto"}</h3><p>{admin ? "Cadastre o nome e o e-mail do cliente. Depois, adicione quantos projetos precisar." : "Ainda não há um cadastro vinculado ao seu e-mail. Peça ao responsável para usar o mesmo e-mail da sua conta."}</p></CardContent></Card> : <>
      {admin && <div className="workspace-customer-row"><label className="field">Cliente<select value={currentClient?.id ?? ""} onChange={e => { setClientId(e.target.value); setProjectId(""); setComment(""); setSearch(""); setFilter("all"); }}>
        {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>)}
      </select></label><div><strong>{currentClient?.email}</strong><p>O cliente acessa com esse e-mail em <a href="/cliente" target="_blank" rel="noopener noreferrer">/cliente</a>.</p></div><Button variant="outline" disabled={busy} onClick={() => setEditor({ kind: "client", value: currentClient })}><PencilSimple /> Editar cliente</Button></div>}
      <div className="workspace-stats"><div><Briefcase /><strong>{projects.length}</strong><span>Projetos</span></div><div><CalendarBlank /><strong>{projects.filter(p => p.stage < 4).length}</strong><span>Em andamento</span></div><div><CheckCircle /><strong>{projects.filter(p => p.stage === 4).length}</strong><span>Concluídos</span></div></div>
      <div className="workspace-filters"><label className="field">Buscar projeto<Input placeholder="Nome do projeto" value={search} onChange={e => setSearch(e.target.value)} /></label><label className="field">Exibir<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos os projetos</option><option value="active">Em andamento</option><option value="done">Concluídos</option></select></label></div>
      {!selected ? <div className="workspace-empty"><Briefcase size={40} /><h3>{projects.length ? "Nenhum projeto encontrado" : "Nenhum projeto cadastrado"}</h3><p>{projects.length ? "Experimente outro nome ou filtro." : admin ? "Adicione um projeto para este cliente usando Novo projeto." : "Os projetos aparecerão aqui assim que forem cadastrados."}</p></div> : <div className="workspace-layout">
        <nav className="workspace-project-list" aria-label="Projetos do cliente">{visibleProjects.map(p => <button key={p.id} aria-current={selected.id === p.id ? "true" : undefined} onClick={() => { setProjectId(p.id); setComment(""); setNotice(""); }}><span className="workspace-stage">{deliveryStages[p.stage]}</span><strong>{p.title}</strong><small>Entrega: {dateLabel(p.due_date)}</small><span className="workspace-mini-progress" aria-hidden="true"><i style={{ width: `${p.stage * 25}%` }} /></span></button>)}</nav>
        <div className="workspace-detail">
          <Card><CardContent className="workspace-project-body"><div className="workspace-project-heading"><div><span className="workspace-stage">{deliveryStages[selected.stage]}</span><h2>{selected.title}</h2></div>{admin && <Button variant="outline" disabled={busy} onClick={() => setEditor({ kind: "project", value: selected })}><PencilSimple /> Editar projeto</Button>}</div>
            {selected.description && <p className="workspace-description">{selected.description}</p>}
            <div className="workspace-progress-heading"><strong>Andamento por etapas</strong><span>{selected.stage * 25}%</span></div>
            <div className="progress-track" role="progressbar" aria-label="Etapas concluídas" aria-valuenow={selected.stage * 25} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${selected.stage * 25}%` }} /></div>
            <ol className="workspace-steps">{deliveryStages.map((stage, i) => <li key={stage} className={i <= selected.stage ? "is-current" : ""} aria-current={i === selected.stage ? "step" : undefined}><span>{i < selected.stage || selected.stage === 4 ? <CheckCircle size={20} /> : i + 1}</span>{stage}</li>)}</ol>
            <dl className="workspace-dates"><div><dt>Início</dt><dd>{dateLabel(selected.start_date)}</dd></div><div><dt>Previsão de entrega</dt><dd>{dateLabel(selected.due_date)}</dd></div><div><dt>Última alteração</dt><dd>{dateLabel(selected.updated_at)}</dd></div></dl>
            <div className="workspace-next"><strong>Próximo passo</strong><p>{selected.next_step || (selected.stage === 4 ? "Projeto concluído. As entregas e o histórico continuam disponíveis aqui." : "O responsável ainda vai informar o próximo passo.")}</p></div>
            {selected.delivery_url && <a className="project-website" href={selected.delivery_url} target="_blank" rel="noopener noreferrer">Abrir entrega <ArrowUpRight size={22} /><span className="sr-only"> em nova aba</span></a>}
          </CardContent></Card>
          <Card><CardContent className="workspace-project-body"><h3 className="workspace-history-title"><ChatsCircle size={26} /> Atualizações e comentários</h3><p className="muted">{admin ? "Compartilhe o que avançou e as orientações para o cliente." : "Converse com o responsável sobre este projeto."} As mensagens ficam salvas aqui.</p>
            <form className="workspace-comment-form" onSubmit={async e => { e.preventDefault(); if (await save({ action: "update", project_id: selected.id, body: comment })) setComment(""); }}><label className="field">{admin ? "Nova atualização" : "Seu comentário"}<Textarea required maxLength={3000} value={comment} onChange={e => setComment(e.target.value)} placeholder={admin ? "O que mudou e qual é o próximo passo?" : "Escreva suas dúvidas ou observações…"} /></label><Button disabled={busy || !comment.trim()} type="submit">{busy ? "Salvando…" : admin ? "Publicar atualização" : "Enviar comentário"}</Button></form>
            <div className="workspace-history">{history.length ? history.map(update => <article key={update.id}><div><strong>{update.author_role === "admin" ? "Denis Ramos · Responsável" : "Cliente"}</strong><time dateTime={update.created_at}>{new Date(update.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</time></div><p>{update.body}</p></article>) : <p className="workspace-empty">As atualizações deste projeto aparecerão aqui.</p>}</div>
          </CardContent></Card>
        </div>
      </div>}
    </>}
  </section>;
}

function WorkspaceEditor({ editor, clients, clientId, busy, onCancel, onSave }: { editor: Editor; clients: Customer[]; clientId: string; busy: boolean; onCancel: () => void; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    await onSave({ ...fields, action: editor.kind, id: editor.value?.id ?? null, version: editor.value?.updated_at ?? null, ...(editor.kind === "project" ? { stage: Number(fields.stage) } : {}) });
  }
  return <Card className="workspace-editor"><CardContent className="workspace-project-body"><h3>{editor.value ? "Editar" : "Novo"} {editor.kind === "client" ? "cliente" : "projeto"}</h3><form onSubmit={submit} className="editor-form"><fieldset disabled={busy}>
    {editor.kind === "client" ? <>
      <div className="two-fields"><label className="field">Nome do cliente<Input name="name" required maxLength={120} defaultValue={editor.value?.name ?? ""} /></label><label className="field">Empresa<Input name="company" maxLength={160} defaultValue={editor.value?.company ?? ""} /></label></div>
      <label className="field">E-mail de acesso<Input name="email" type="email" required maxLength={254} defaultValue={editor.value?.email ?? ""} /><small>Use o mesmo e-mail que o cliente confirmará na conta. Alterar este campo transfere o acesso aos projetos para o novo e-mail.</small></label>
    </> : <>
      <div className="two-fields"><label className="field">Cliente<select name="client_id" required defaultValue={editor.value?.client_id ?? clientId}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field">Nome do projeto<Input name="title" required maxLength={160} defaultValue={editor.value?.title ?? ""} /></label></div>
      <label className="field">Resumo do projeto<Textarea name="description" maxLength={3000} defaultValue={editor.value?.description ?? ""} /></label>
      <div className="two-fields"><label className="field">Etapa atual<select name="stage" defaultValue={editor.value?.stage ?? 0}>{deliveryStages.map((stage, i) => <option key={stage} value={i}>{stage}</option>)}</select></label><label className="field">Link da entrega<Input name="delivery_url" maxLength={2000} placeholder="Link da apresentação, protótipo ou site" defaultValue={editor.value?.delivery_url ?? ""} /></label></div>
      <div className="two-fields"><label className="field">Data de início<Input name="start_date" type="date" defaultValue={editor.value?.start_date ?? ""} /></label><label className="field">Previsão de entrega<Input name="due_date" type="date" defaultValue={editor.value?.due_date ?? ""} /></label></div>
      <label className="field">Próximo passo<Textarea name="next_step" maxLength={1000} defaultValue={editor.value?.next_step ?? ""} placeholder="Ex.: Aguardando aprovação da home até sexta-feira." /></label>
    </>}
    <div className="workspace-actions"><Button type="submit">{busy ? "Salvando…" : "Salvar"}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button></div>
  </fieldset></form></CardContent></Card>;
}
