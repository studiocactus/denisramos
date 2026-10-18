"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowClockwise, ArrowUpRight, Briefcase, CalendarBlank, CheckCircle, ChatsCircle, Plus, User, PencilSimple, Archive, ArrowCounterClockwise, Trash, NotePencil, FileArrowUp, Star, WarningCircle, Circle } from "@phosphor-icons/react";
import { deliveryStages, projectProgress, type Customer, type ClientProject, type Deliverable, type ProjectTask, type WorkspaceData } from "@/lib/client-projects";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import { StageMeter } from "./workspace-motion";
import ProjectFiles from "./project-files";
import WorkspaceMailStatus from "./workspace-mail-status";

const empty: WorkspaceData = { clients: [], projects: [], updates: [] };
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "medium" }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : "A definir";
const isOverdue = (value: string | null) => !!value && value < new Date().toISOString().slice(0, 10);
type Editor = { kind: "client"; value?: Customer } | { kind: "project"; value?: ClientProject } | { kind: "task"; value?: ProjectTask } | { kind: "deliverable"; value?: Deliverable };

export default function ClientProjectsWorkspace({ admin = false, active = true, focus, onFocus }: { admin?: boolean; active?: boolean; focus?: { clientId?: string; projectId?: string } | null; onFocus?: (selection: { clientId?: string; projectId?: string }) => void }) {
  const [data, setData] = useState<WorkspaceData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteProject, setDeleteProject] = useState(false);
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  useEffect(() => { setReplyTo(null); }, [projectId, clientId]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  useEffect(() => setDeleteProject(false), [projectId, clientId, search, filter]);

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
    if (admin || !active) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    return () => clearInterval(timer);
  }, [admin, active, load]);

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
      if (payload.action === "task" && result.id && !payload.id) { setProjectId(String(payload.project_id)); }
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); return false; }
    finally { setBusy(false); }
  }
  // Opening a project marks only my side as read; the other party keeps theirs.
  useEffect(() => {
    if (!projectId || loading) return;
    const timer = setTimeout(() => { void fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_read", project_id: projectId }) }).catch(() => {}); }, 1200);
    return () => clearTimeout(timer);
  }, [projectId, loading]);

  const currentClient = data.clients.find(c => c.id === clientId) ?? data.clients[0];
  const projects = data.projects.filter(p => p.client_id === currentClient?.id);
  const visibleProjects = projects.filter(p => p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (filter === "archived" ? !!p.archived_at : !p.archived_at && (filter === "all" || (filter === "done" ? p.stage === 4 : p.stage !== 4))));
  // A deep link from the overview wins over the default selection once.
  const linked = focus?.projectId && visibleProjects.some(p => p.id === focus.projectId) ? visibleProjects.find(p => p.id === focus.projectId) : undefined;
  const selected = linked ?? visibleProjects.find(p => p.id === projectId) ?? visibleProjects[0];
  const history = data.updates.filter(u => u.project_id === selected?.id);
  const tasks = (data.tasks ?? []).filter(t => t.project_id === selected?.id);
  const deliverables = (data.deliverables ?? []).filter(d => d.project_id === selected?.id);
  const latestIds = new Set(deliverables.map(d => d.supersedes).filter(Boolean));
  const activeDeliverables = deliverables.filter(d => !latestIds.has(d.id));

  useEffect(() => {
    if (focus?.clientId && data.clients.some(c => c.id === focus.clientId)) setClientId(focus.clientId);
    if (focus?.projectId && data.projects.some(p => p.id === focus.projectId)) {
      const project = data.projects.find(p => p.id === focus.projectId);
      if (project) { setClientId(project.client_id); setProjectId(focus.projectId); if (filter === "archived" && !project.archived_at) setFilter("all"); }
      onFocus?.({ clientId: project?.client_id, projectId: focus.projectId });
    }
  // Apply each deep link once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.clientId, focus?.projectId, data.clients, data.projects]);

  if (loading) return <p role="status" className="workspace-empty">Carregando clientes e projetos…</p>;
  return <section className="client-workspace" aria-label={admin ? "Gestão de clientes e projetos" : "Meus projetos"}>
    {error && <div className="workspace-notice" role="alert"><p>{error}</p>{setup && admin && <p>Execute as migrações <code>202609110001</code> a <code>202610180003</code> no Supabase para ativar esta área completa.</p>}<Button variant="outline" disabled={busy} onClick={() => void load()}><ArrowClockwise /> Tentar novamente</Button></div>}
    {notice && <p className="workspace-notice" role="status">{notice}</p>}
    {data.missingFeatures?.length ? <p className="workspace-notice" role="status">Recursos ainda não ativados no banco: {data.missingFeatures.join(", ")}. Execute a migração mais recente para usá-los. O restante da área funciona normalmente.</p> : null}
    {admin && active && <WorkspaceMailStatus revision={data} />}
    <div className="workspace-toolbar">
      <div>{!admin && <h2>{`Olá${currentClient ? `, ${currentClient.name}` : ""}.`}</h2>}<p>{admin ? "Organize as entregas e mantenha cada cliente por dentro." : "Acompanhe o andamento, os próximos passos e as entregas."}</p></div>
      <div className="workspace-actions">
        <Button variant="outline" disabled={busy} onClick={() => void load()} aria-label="Atualizar projetos"><ArrowClockwise /> Atualizar</Button>
        {!admin && currentClient && <Button variant="outline" onClick={() => setEditor({ kind: "client", value: currentClient })}>Editar perfil</Button>}{admin && <><Button variant="outline" disabled={busy || setup} onClick={() => { setError(""); setEditor({ kind: "client" }); }}><User /> Novo cliente</Button><Button disabled={busy || setup || !data.clients.length} onClick={() => { setError(""); setEditor({ kind: "project" }); }}><Plus /> Novo projeto</Button></>}
      </div>
    </div>
    {editor && <WorkspaceEditor key={`${editor.kind}-${editor.value?.id ?? "new"}`} editor={editor} admin={admin} clients={data.clients} projects={projects} defaultProjectId={selected?.id ?? ""} defaultClientId={currentClient?.id ?? ""} busy={busy} onCancel={() => setEditor(null)} onSave={async payload => { if (await save(payload)) setEditor(null); }} />}
    {!data.clients.length ? <Card><CardContent className="workspace-empty"><User size={40} /><h3>{admin ? "Seu primeiro cliente começa aqui" : "Seu acesso está pronto"}</h3><p>{admin ? "Cadastre o nome e o e-mail do cliente. Depois, adicione quantos projetos precisar." : "Ainda não há um cadastro vinculado ao seu e-mail. Peça ao responsável para usar o mesmo e-mail da sua conta."}</p></CardContent></Card> : <>
      {admin && <div className="workspace-customer-row"><label className="field">Cliente<select value={currentClient?.id ?? ""} onChange={e => { setClientId(e.target.value); setProjectId(""); setComment(""); setSearch(""); setFilter("all"); }}>
        {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>)}
      </select></label><div><strong>{currentClient?.email}</strong><p>O cliente acessa com esse e-mail em <a href="/cliente" target="_blank" rel="noopener noreferrer">/cliente</a>.</p></div><Button variant="outline" disabled={busy} onClick={() => setEditor({ kind: "client", value: currentClient })}><PencilSimple /> Editar perfil do cliente</Button></div>}
      <ClientProfile client={currentClient} /><div className="workspace-stats"><div><Briefcase /><strong>{projects.length}</strong><span>Projetos</span></div><div><CalendarBlank /><strong>{projects.filter(p => !p.archived_at && p.stage < 4).length}</strong><span>Em andamento</span></div><div><CheckCircle /><strong>{projects.filter(p => !p.archived_at && p.stage === 4).length}</strong><span>Concluídos</span></div></div>
      {admin && currentClient && <InternalNotes client={currentClient} body={data.clientNotes?.[currentClient.id] ?? ""} busy={busy} onSave={body => save({ action: "client_note", id: currentClient.id, version: currentClient.updated_at, body })} />}
      <div className="workspace-filters"><label className="field">Buscar projeto<Input placeholder="Nome do projeto" value={search} onChange={e => setSearch(e.target.value)} /></label><label className="field">Exibir<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Não arquivados</option><option value="active">Em andamento</option><option value="done">Concluídos</option><option value="archived">Arquivados</option></select></label></div>
      {!selected ? <div className="workspace-empty"><Briefcase size={40} /><h3>{projects.length ? "Nenhum projeto encontrado" : "Nenhum projeto cadastrado"}</h3><p>{projects.length ? "Experimente outro nome ou filtro." : admin ? "Adicione um projeto para este cliente usando Novo projeto." : "Os projetos aparecerão aqui assim que forem cadastrados."}</p></div> : <div className="workspace-layout">
        <nav className="workspace-project-list" aria-label="Projetos do cliente">{visibleProjects.map(p => <button key={p.id} aria-current={selected.id === p.id ? "true" : undefined} onClick={() => { setProjectId(p.id); setComment(""); setInternal(false); setNotice(""); }}><span className="workspace-stage">{p.archived_at ? "Arquivado" : deliveryStages[p.stage]}</span><strong>{p.title}</strong><small>Entrega: {dateLabel(p.due_date)}</small>{(data.unread?.[p.id] ?? 0) > 0 && <span className="workspace-unread"><Circle size={10} weight="fill" aria-hidden="true" />{data.unread![p.id]} mensagem{(data.unread![p.id] > 1) ? "s" : ""} sem leitura</span>}<span className="workspace-mini-progress" aria-hidden="true"><i style={{ width: `${p.stage * 25}%` }} /></span></button>)}</nav>
        <div className="workspace-detail">
          <Card><CardContent className="workspace-project-body"><div className="workspace-project-heading"><div><span className="workspace-stage">{selected.archived_at ? "Arquivado" : deliveryStages[selected.stage]}</span><h2>{selected.title}</h2></div>{admin && <div className="workspace-actions workspace-project-icon-actions"><Button variant="outline" size="icon" aria-label="Editar projeto" title="Editar projeto" disabled={busy} onClick={() => setEditor({ kind: "project", value: selected })}><PencilSimple aria-hidden="true" /></Button><Button variant="outline" size="icon" aria-label={selected.archived_at ? "Desarquivar projeto" : "Arquivar projeto"} title={selected.archived_at ? "Desarquivar projeto" : "Arquivar projeto"} disabled={busy} onClick={async () => { if (await save({ action: "archive_project", id: selected.id, version: selected.updated_at, archived: !selected.archived_at })) { setFilter(selected.archived_at ? "all" : "archived"); setEditor(null); } }}>{selected.archived_at ? <ArrowCounterClockwise aria-hidden="true" /> : <Archive aria-hidden="true" />}</Button><Button variant="outline" size="icon" aria-label="Excluir projeto" title="Excluir projeto" disabled={busy} onClick={() => setDeleteProject(true)}><Trash aria-hidden="true" /></Button></div>}</div>
            {admin && deleteProject && <div className="workspace-notice" role="group" aria-label="Confirmar exclusão do projeto"><strong>Excluir “{selected.title}”?</strong><p>O projeto, as mensagens e os anexos deixarão de aparecer para você e para o cliente. Os dados serão preservados internamente.</p><div className="workspace-actions"><Button variant="destructive" disabled={busy} onClick={async () => { if (await save({ action: "delete_project", id: selected.id, version: selected.updated_at })) { setDeleteProject(false); setEditor(null); setProjectId(""); setComment(""); setReplyTo(null); } }}>{busy ? "Excluindo…" : "Confirmar exclusão"}</Button><Button variant="outline" disabled={busy} onClick={() => setDeleteProject(false)}>Cancelar</Button></div></div>}
            {selected.description && <p className="workspace-description">{selected.description}</p>}
            {(() => { const progress = projectProgress(selected, tasks, deliverables); return <><StageMeter key={selected.id} value={progress.percent} animate={admin} labels={progress.labels} /></>; })()}
            <ol className="workspace-steps">{deliveryStages.map((stage, i) => <li key={stage} className={i <= selected.stage ? "is-current" : ""} aria-current={i === selected.stage ? "step" : undefined}><span>{i < selected.stage || selected.stage === 4 ? <CheckCircle size={20} /> : i + 1}</span>{stage}</li>)}</ol>
            <dl className="workspace-dates"><div><dt>Início</dt><dd>{dateLabel(selected.start_date)}</dd></div><div><dt>Previsão de entrega</dt><dd className={isOverdue(selected.due_date) && selected.stage < 4 ? "workspace-overdue" : ""}>{dateLabel(selected.due_date)}{isOverdue(selected.due_date) && selected.stage < 4 ? " · atrasada" : ""}</dd></div><div><dt>Última alteração</dt><dd>{dateLabel(selected.updated_at)}</dd></div></dl>
            <div className="workspace-next"><strong>Próximo passo</strong><p>{selected.next_step || (selected.stage === 4 ? "Projeto concluído. As entregas e o histórico continuam disponíveis aqui." : "O responsável ainda vai informar o próximo passo.")}</p></div>
            {selected.delivery_url && <a className="project-website" href={selected.delivery_url} target="_blank" rel="noopener noreferrer">Abrir entrega <ArrowUpRight size={22} /><span className="sr-only"> em nova aba</span></a>}
          </CardContent></Card>
          <TasksCard admin={admin} tasks={tasks} busy={busy} onAdd={() => setEditor({ kind: "task" })} onEdit={task => setEditor({ kind: "task", value: task })} onDelete={task => save({ action: "delete_task", id: task.id })} onToggle={(task, done) => save({ action: "task_done", id: task.id, done })} />
          <DeliverablesCard admin={admin} deliverables={activeDeliverables} busy={busy} onAdd={() => setEditor({ kind: "deliverable" })} onNewVersion={deliverable => setEditor({ kind: "deliverable", value: deliverable })} onDelete={deliverable => save({ action: "delete_deliverable", id: deliverable.id })} onReview={(deliverable, status, body) => save({ action: "review_deliverable", id: deliverable.id, status, body })} />
          <ProjectFiles key={selected.id} projectId={selected.id} deliverables={activeDeliverables} /><Card><CardContent className="workspace-project-body"><h3 className="workspace-history-title"><ChatsCircle size={26} /> Atualizações e comentários</h3><p className="muted">{admin ? "Compartilhe o que avançou e as orientações para o cliente." : "Converse com o responsável sobre este projeto."} As mensagens ficam salvas aqui.</p>
            <form className="workspace-comment-form" onSubmit={async e => { e.preventDefault(); if (await save({ action: "update", project_id: selected.id, body: comment, reply_to: replyTo, internal })) { setComment(""); setReplyTo(null); setInternal(false); } }}>{replyTo && <div className="workspace-reply"><p>Respondendo: {history.find(u => u.id === replyTo)?.body}</p><Button type="button" variant="outline" onClick={() => setReplyTo(null)}>Cancelar resposta</Button></div>}<label className="field">{admin && internal ? "Nota interna (não aparece para o cliente)" : admin ? "Nova atualização" : "Seu comentário"}<Textarea required maxLength={3000} value={comment} onChange={e => setComment(e.target.value)} placeholder={admin ? "O que mudou e qual é o próximo passo?" : "Escreva suas dúvidas ou observações…"} /></label>{admin && <label className="checkbox-field"><input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} /> <NotePencil size={16} aria-hidden="true" /> Nota interna — somente você vê</label>}<Button disabled={busy || !comment.trim()} type="submit">{busy ? "Salvando…" : admin ? internal ? "Salvar nota interna" : "Publicar atualização" : "Enviar comentário"}</Button></form>
            <div className="workspace-history">{history.length ? history.map(update => <article key={update.id} className={update.internal ? "workspace-internal" : undefined}><div><strong>{update.internal ? <><NotePencil size={15} aria-hidden="true" /> Nota interna</> : update.author_role === "admin" ? "Denis Ramos · Responsável" : "Cliente"}</strong><time dateTime={update.created_at}>{new Date(update.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</time></div><MessageEntry update={update} original={history.find(u => u.id === update.reply_to)?.body} admin={admin} busy={busy} save={save} onReply={() => { setReplyTo(update.id); setInternal(false); document.querySelector<HTMLTextAreaElement>(".workspace-comment-form textarea")?.focus(); }} /></article>) : <p className="workspace-empty">As atualizações deste projeto aparecerão aqui.</p>}</div>
          </CardContent></Card>
        </div>
      </div>}
    </>}
  </section>;
}

function TasksCard({ admin, tasks, busy, onAdd, onEdit, onDelete, onToggle }: { admin: boolean; tasks: ProjectTask[]; busy: boolean; onAdd: () => void; onEdit: (task: ProjectTask) => void; onDelete: (task: ProjectTask) => void; onToggle: (task: ProjectTask, done: boolean) => void }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const open = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  return <Card><CardContent className="workspace-project-body"><div className="workspace-section-heading"><h3><CalendarBlank size={26} /> Tarefas e pendências</h3>{admin && <Button variant="outline" disabled={busy} onClick={onAdd}><Plus /> Nova tarefa</Button>}</div>
    <p className="muted">{open.length ? `${open.length} em aberto${done.length ? ` · ${done.length} concluída${done.length > 1 ? "s" : ""}` : ""}` : "Nenhuma tarefa em aberto."} O responsável define o que é sua ou do cliente; nada é concluído sozinho com a passagem da data.</p>
    {tasks.length === 0 ? <p className="workspace-empty">As tarefas deste projeto aparecerão aqui.</p> : <ul className="workspace-task-list">{[...open, ...done].map(task => <li key={task.id} className={task.done ? "is-done" : undefined}>
      <label className="checkbox-field"><input type="checkbox" checked={task.done} disabled={busy || (!admin && task.owner !== "client")} onChange={e => onToggle(task, e.target.checked)} /><span><strong>{task.title}</strong><small>{task.owner === "client" ? "Aguardando o cliente" : "Com o responsável"}{task.due_date ? ` · prazo ${dateLabel(task.due_date)}` : ""}{isOverdue(task.due_date) && !task.done ? " · atrasada" : ""}{task.done && task.done_at ? ` · concluída em ${dateLabel(task.done_at)}` : ""}</small></span></label>
      {isOverdue(task.due_date) && !task.done && <WarningCircle size={18} weight="fill" className="workspace-overdue-icon" aria-label="Prazo vencido" />}
      {admin && <div className="workspace-actions workspace-task-actions"><Button size="icon" variant="ghost" aria-label={`Editar tarefa ${task.title}`} disabled={busy} onClick={() => onEdit(task)}><PencilSimple /></Button>{confirming === task.id ? <Button size="icon" variant="ghost" aria-label="Confirmar exclusão da tarefa" disabled={busy} onClick={async () => { await onDelete(task); setConfirming(null); }}><CheckCircle /></Button> : <Button size="icon" variant="ghost" aria-label={`Excluir tarefa ${task.title}`} disabled={busy} onClick={() => setConfirming(task.id)}><Trash /></Button>}</div>}
    </li>)}</ul>}
  </CardContent></Card>;
}

const deliverableStatus = { in_review: ["Em revisão", "workspace-status-review"], approved: ["Aprovada", "workspace-status-approved"], changes_requested: ["Ajustes solicitados", "workspace-status-changes"] } as const;

function DeliverablesCard({ admin, deliverables, busy, onAdd, onNewVersion, onDelete, onReview }: { admin: boolean; deliverables: Deliverable[]; busy: boolean; onAdd: () => void; onNewVersion: (deliverable: Deliverable) => void; onDelete: (deliverable: Deliverable) => void; onReview: (deliverable: Deliverable, status: "approved" | "changes_requested", body: string) => Promise<boolean> }) {
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  return <Card><CardContent className="workspace-project-body"><div className="workspace-section-heading"><h3><FileArrowUp size={26} /> Entregas e versões</h3>{admin && <Button variant="outline" disabled={busy} onClick={onAdd}><Plus /> Nova entrega</Button>}</div>
    <p className="muted">Cada versão fica registrada. A aprovação identifica quem decidiu e quando.</p>
    {deliverables.length === 0 ? <p className="workspace-empty">As entregas deste projeto aparecerão aqui.</p> : <ul className="workspace-deliverable-list">{deliverables.map(deliverable => <li key={deliverable.id}>
      <div className="workspace-deliverable-head"><div><strong>{deliverable.title}</strong><small>Versão {deliverable.version} · enviada em {dateLabel(deliverable.created_at)}</small></div><span className={`workspace-status ${deliverableStatus[deliverable.status][1]}`}>{deliverable.status === "approved" && <Star size={13} weight="fill" aria-hidden="true" />}{deliverableStatus[deliverable.status][0]}</span></div>
      {deliverable.description && <p className="workspace-deliverable-description">{deliverable.description}</p>}
      {deliverable.preview_url && <a className="project-website" href={deliverable.preview_url} target="_blank" rel="noopener noreferrer">Ver prévia <ArrowUpRight size={18} /><span className="sr-only"> em nova aba</span></a>}
      {deliverable.status === "approved" && deliverable.approved_at && <p className="workspace-approval"><Star size={15} weight="fill" aria-hidden="true" /> Aprovada por {deliverable.approved_by === "client" ? "você" : "o responsável"} em {dateLabel(deliverable.approved_at)}</p>}
      <div className="workspace-actions">
        {admin ? <><Button size="sm" variant="outline" disabled={busy} onClick={() => onNewVersion(deliverable)}><FileArrowUp size={16} /> Publicar nova versão</Button>{confirming === deliverable.id ? <Button size="sm" variant="destructive" disabled={busy} onClick={async () => { await onDelete(deliverable); setConfirming(null); }}>Confirmar exclusão</Button> : <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(deliverable.id)}><Trash size={16} /> Excluir</Button>}</>
          : deliverable.status !== "approved" && <>{reviewing === deliverable.id ? null : <><Button size="sm" disabled={busy} onClick={() => onReview(deliverable, "approved", "")}><CheckCircle size={16} /> Aprovar versão</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => { setReviewing(deliverable.id); setBody(""); }}>Solicitar ajustes</Button></>}</>}
      </div>
      {reviewing === deliverable.id && <form className="workspace-comment-form" onSubmit={async e => { e.preventDefault(); if (await onReview(deliverable, "changes_requested", body)) { setReviewing(null); setBody(""); } }}><label className="field">O que precisa de ajuste?<Textarea required maxLength={3000} value={body} onChange={e => setBody(e.target.value)} placeholder="Explique o que ajustar nesta versão…" /></label><div className="workspace-actions"><Button disabled={busy || !body.trim()} type="submit">Enviar pedido de ajuste</Button><Button type="button" variant="outline" onClick={() => setReviewing(null)}>Cancelar</Button></div></form>}
    </li>)}</ul>}
  </CardContent></Card>;
}

function InternalNotes({ client, body, busy, onSave }: { client: Customer; body: string; busy: boolean; onSave: (body: string) => Promise<boolean> }) {
  const [value, setValue] = useState(body);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setValue(body); setSaved(false); }, [body, client.id]);
  return <details className="workspace-profile workspace-internal-notes"><summary><NotePencil size={17} aria-hidden="true" /> Anotações internas sobre {client.name}</summary>
    <p className="muted">Visível apenas para você. Não aparece na área do cliente nem em e-mails.</p>
    <label className="field">Anotações internas<Textarea maxLength={5000} value={value} onChange={e => { setValue(e.target.value); setSaved(false); }} placeholder="Preferências, histórico de conversas, combinados…" /></label>
    <div className="workspace-actions"><Button disabled={busy || value === body} onClick={async () => { if (await onSave(value)) setSaved(true); }}>{busy ? "Salvando…" : "Salvar anotação"}</Button>{saved && <span role="status"><CheckCircle size={15} aria-hidden="true" /> Anotação salva</span>}</div>
  </details>;
}

function WorkspaceEditor({ editor, admin, clients, projects, defaultProjectId, defaultClientId, busy, onCancel, onSave }: { editor: Editor; admin: boolean; clients: Customer[]; projects: ClientProject[]; defaultProjectId: string; defaultClientId: string; busy: boolean; onCancel: () => void; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (editor.kind === "task") return onSave({ ...fields, action: "task", id: editor.value?.id ?? null, version: editor.value?.updated_at ?? null, project_id: editor.value?.project_id ?? fields.project_id, owner: String(fields.owner), done: editor.value?.done ?? false });
    if (editor.kind === "deliverable") return onSave({ ...fields, action: editor.value ? "deliverable_version" : "deliverable", id: editor.value?.id ?? null, version: editor.value?.updated_at ?? null, project_id: editor.value?.project_id ?? fields.project_id });
    await onSave({ ...fields, action: editor.kind === "client" && !admin ? "profile" : editor.kind, id: editor.value?.id ?? null, version: editor.value?.updated_at ?? null, ...(editor.kind === "project" ? { stage: Number(fields.stage) } : {}) });
  }
  const projectPicker = (currentId: string) => <label className="field">Projeto<select name="project_id" required defaultValue={currentId || defaultProjectId}><option value="" disabled>Selecione…</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>;
  return <Card className="workspace-editor"><CardContent className="workspace-project-body"><h3>{editor.kind === "task" ? `${editor.value ? "Editar" : "Nova"} tarefa` : editor.kind === "deliverable" ? `${editor.value ? "Nova versão da" : "Nova"} entrega` : `${editor.value ? "Editar" : "Novo"} ${editor.kind === "client" ? "cliente" : "projeto"}`}</h3><form onSubmit={submit} className="editor-form"><fieldset disabled={busy}>
    {editor.kind === "client" ? <>
      <div className="two-fields"><label className="field">Nome do cliente<Input name="name" required maxLength={120} defaultValue={editor.value?.name ?? ""} /></label><label className="field">Empresa<Input name="company" maxLength={160} defaultValue={editor.value?.company ?? ""} /></label></div>
      <label className="field">E-mail de acesso<Input name="email" type="email" readOnly={!admin} required maxLength={254} defaultValue={editor.value?.email ?? ""} /><small>{admin ? "Use o mesmo e-mail que o cliente confirmará na conta. Alterar este campo transfere o acesso aos projetos para o novo e-mail." : "Este é o e-mail da sua conta. Para alterá-lo, fale com o responsável."}</small></label>
      <div className="two-fields">{([["phone", "Telefone de contato", 40], ["project_contact", "Responsável pelo projeto", 120], ["additional_email", "E-mail adicional", 254], ["whatsapp", "WhatsApp", 40], ["address", "Endereço", 500]] as const).map(([name, label, max]) => <label className="field" key={name}>{label}<Input name={name} type={name === "additional_email" ? "email" : name === "phone" || name === "whatsapp" ? "tel" : "text"} maxLength={max} defaultValue={editor.value?.[name] ?? ""} /></label>)}</div>{editor.value?.address && <a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(editor.value.address)} target="_blank" rel="noopener noreferrer">Ver endereço no Google Maps</a>}
    </> : editor.kind === "task" ? <>
      <div className="two-fields"><label className="field">Título da tarefa<Input name="title" required maxLength={200} defaultValue={editor.value?.title ?? ""} placeholder="Ex.: Enviar textos da home" /></label><label className="field">Responsável<select name="owner" defaultValue={editor.value?.owner ?? "admin"}><option value="admin">Comigo (responsável)</option><option value="client">Com o cliente</option></select></label></div>
      {!editor.value && projectPicker(defaultProjectId)}
      <label className="field">Prazo (opcional)<Input name="due_date" type="date" defaultValue={editor.value?.due_date ?? ""} /><small>O prazo organiza a lista; nunca marca a tarefa como concluída sozinho.</small></label>
    </> : editor.kind === "deliverable" ? <>
      <label className="field">Título da entrega<Input name="title" required maxLength={160} defaultValue={editor.value?.title ?? ""} placeholder="Ex.: Layout da página inicial" /></label>
      {!editor.value && projectPicker(defaultProjectId)}
      <label className="field">Descrição<Textarea name="description" maxLength={3000} defaultValue={editor.value?.description ?? ""} placeholder="O que esta versão contém e o que precisa de atenção." /></label>
      <label className="field">Link da prévia (opcional)<Input name="preview_url" maxLength={2000} defaultValue={editor.value?.preview_url ?? ""} placeholder="Figma, protótipo ou página" /></label>
      {editor.value && <p className="muted">A nova versão entra em revisão e o cliente recebe um aviso na fila de e-mails.</p>}
    </> : <>
      <div className="two-fields"><label className="field">Cliente<select name="client_id" required defaultValue={editor.value?.client_id ?? defaultClientId}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field">Nome do projeto<Input name="title" required maxLength={160} defaultValue={editor.value?.title ?? ""} /></label></div>
      <label className="field">Resumo do projeto<Textarea name="description" maxLength={3000} defaultValue={editor.value?.description ?? ""} /></label>
      <div className="two-fields"><label className="field">Etapa atual<select name="stage" defaultValue={editor.value?.stage ?? 0}>{deliveryStages.map((stage, i) => <option key={stage} value={i}>{stage}</option>)}</select></label><label className="field">Link da entrega<Input name="delivery_url" maxLength={2000} placeholder="Link da apresentação, protótipo ou site" defaultValue={editor.value?.delivery_url ?? ""} /></label></div>
      <div className="two-fields"><label className="field">Data de início<Input name="start_date" type="date" defaultValue={editor.value?.start_date ?? ""} /></label><label className="field">Previsão de entrega<Input name="due_date" type="date" defaultValue={editor.value?.due_date ?? ""} /></label></div>
      <label className="field">Próximo passo<Textarea name="next_step" maxLength={1000} defaultValue={editor.value?.next_step ?? ""} placeholder="Ex.: Aguardando aprovação da home até sexta-feira." /></label>
    </>}
    <div className="workspace-actions"><Button type="submit">{busy ? "Salvando…" : "Salvar"}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button></div>
  </fieldset></form></CardContent></Card>;
}

function MessageEntry({ update, original, admin, busy, save, onReply }: { update: WorkspaceData["updates"][number]; original?: string; admin: boolean; busy: boolean; save: (p: Record<string, unknown>) => Promise<boolean>; onReply: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false), [body, setBody] = useState(update.body);
  return <>{update.reply_to && <blockquote>{original ?? "Mensagem original indisponível"}</blockquote>}{editing ? <form onSubmit={async e => { e.preventDefault(); if (await save({ action: "edit_message", id: update.id, body })) setEditing(false); }}><label className="field">Editar mensagem<Textarea required maxLength={3000} value={body} onChange={e => setBody(e.target.value)} /></label><div className="workspace-actions"><Button disabled={busy}>Salvar mensagem</Button><Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button></div></form> : <p>{update.body}</p>}{admin && <div className="workspace-actions"><Button variant="outline" disabled={busy} onClick={onReply}>Responder</Button>{!update.internal && <><Button variant="outline" disabled={busy} onClick={() => { setBody(update.body); setEditing(true); }}>Editar</Button><Button variant="outline" disabled={busy} onClick={() => setDeleting(true)}>Excluir</Button></>}</div>}{admin && deleting && <div className="workspace-notice" role="group" aria-label="Confirmar exclusão da mensagem"><p>Excluir esta mensagem? Esta ação não pode ser desfeita.</p><div className="workspace-actions"><Button variant="destructive" disabled={busy} onClick={() => void save({ action: "delete_message", id: update.id })}>{busy ? "Excluindo…" : "Confirmar exclusão"}</Button><Button variant="outline" disabled={busy} onClick={() => setDeleting(false)}>Cancelar</Button></div></div>}</>;
}

function ClientProfile({ client }: { client: Customer }) {
  return <details className="workspace-profile"><summary>Perfil de {client.name}</summary><dl>
    {([["Empresa", client.company], ["E-mail de acesso", client.email], ["Telefone", client.phone], ["Responsável pelo projeto", client.project_contact], ["E-mail adicional", client.additional_email], ["WhatsApp", client.whatsapp], ["Endereço", client.address]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Não informado"}</dd></div>)}
  </dl></details>;
}
