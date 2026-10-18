"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, CalendarBlank, CheckCircle, ChatsCircle, Circle, MagnifyingGlass, NotePencil, Star, Storefront, WarningCircle } from "@phosphor-icons/react";
import { deliveryStages, projectProgress, opportunityStages, type WorkspaceData } from "@/lib/client-projects";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "medium" }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : "A definir";
const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (value: string | null) => !!value && value < today();
const isSoon = (value: string | null) => { if (!value) return false; const diff = (Date.parse(`${value}T12:00:00Z`) - Date.parse(`${today()}T12:00:00Z`)) / 86400000; return diff >= 0 && diff <= 7; };

type Overview = { data: WorkspaceData | null; error: string; loading: boolean };

export default function DashboardOverview({ onOpen }: { onOpen: (tab: string, selection?: { clientId?: string; projectId?: string }) => void }) {
  const [state, setState] = useState<Overview>({ data: null, error: "", loading: true });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace?admin=1", { cache: "no-store", signal: controller.signal })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setState({ data: result, error: "", loading: false }); })
      .catch(e => { if (!controller.signal.aborted) setState({ data: null, error: e instanceof Error ? e.message : "Não foi possível carregar o painel.", loading: false }); });
    return () => controller.abort();
  }, []);
  if (state.loading) return <p role="status" className="workspace-empty">Carregando o que precisa da sua atenção…</p>;
  if (state.error) return <div className="workspace-notice" role="alert"><p>{state.error}</p><Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button></div>;
  const data = state.data!;
  const openProjects = data.projects.filter(p => !p.archived_at && p.stage < 4);
  const tasks = data.tasks ?? [];
  const deliverables = data.deliverables ?? [];
  const latestIds = new Set(deliverables.map(d => d.supersedes).filter(Boolean));
  const activeDeliverables = deliverables.filter(d => !latestIds.has(d.id));
  const needsApproval = activeDeliverables.filter(d => d.status === "in_review");
  const requestedChanges = activeDeliverables.filter(d => d.status === "changes_requested");
  const myTasks = tasks.filter(t => !t.done && t.owner === "admin");
  const clientTasks = tasks.filter(t => !t.done && t.owner === "client");
  const unreadTotal = Object.values(data.unread ?? {}).reduce((a, b) => a + b, 0);
  const projectById = new Map(data.projects.map(p => [p.id, p]));
  const clientById = new Map(data.clients.map(c => [c.id, c]));
  const goToProject = (projectId: string) => { const project = projectById.get(projectId); onOpen("clients", { clientId: project?.client_id, projectId }); };
  const overdueTasks = myTasks.filter(t => isOverdue(t.due_date));
  const overdueDeliveries = openProjects.filter(p => isOverdue(p.due_date));
  const opportunities = data.opportunities ?? [];
  const activeOpportunities = opportunities.filter(o => o.stage !== "ganho" && o.stage !== "perdido");
  const waitingAnswer = activeOpportunities.filter(o => !o.next_action_date || isOverdue(o.next_action_date));
  const nextContacts = activeOpportunities.filter(o => o.next_action_date && (isSoon(o.next_action_date) || isOverdue(o.next_action_date)));

  return <div className="overview">
    {(overdueDeliveries.length > 0 || overdueTasks.length > 0 || requestedChanges.length > 0) && <Card className="overview-alert"><CardContent>
      <h2><WarningCircle size={22} weight="fill" aria-hidden="true" /> Precisa de atenção</h2>
      <ul>{overdueDeliveries.map(p => <li key={p.id}><button onClick={() => goToProject(p.id)}><CalendarBlank size={17} aria-hidden="true" /><span><strong>{p.title}</strong> passou da previsão de entrega ({dateLabel(p.due_date)}).</span><ArrowUpRight size={16} aria-hidden="true" /></button></li>)}
        {overdueTasks.map(t => <li key={t.id}><button onClick={() => goToProject(t.project_id)}><WarningCircle size={17} aria-hidden="true" /><span>Tarefa minha atrasada: <strong>{t.title}</strong> ({dateLabel(t.due_date)}).</span><ArrowUpRight size={16} aria-hidden="true" /></button></li>)}
        {requestedChanges.map(d => <li key={d.id}><button onClick={() => goToProject(d.project_id)}><Star size={17} aria-hidden="true" /><span><strong>{d.title} v{d.version}</strong>: o cliente pediu ajustes.</span><ArrowUpRight size={16} aria-hidden="true" /></button></li>)}</ul>
    </CardContent></Card>}
    <div className="dashboard-columns">
      <Card><CardHeader><CardTitle><ChatsCircle size={20} aria-hidden="true" /> Atendimento</CardTitle></CardHeader><CardContent className="overview-list">
        <OverviewItem icon={<Circle size={10} weight="fill" aria-hidden="true" />} badge={unreadTotal > 0} active={unreadTotal > 0} onClick={() => onOpen("clients")}
          title={unreadTotal ? `${unreadTotal} mensagem${unreadTotal > 1 ? "s" : ""} sem leitura` : "Caixa em dia"}
          detail={unreadTotal ? "Clientes aguardando resposta" : "Nenhuma mensagem sem ler"} />
        <OverviewItem icon={<Star size={17} aria-hidden="true" />} badge={needsApproval.length > 0} active={needsApproval.length > 0} onClick={() => onOpen("clients")}
          title={needsApproval.length ? `${needsApproval.length} entrega${needsApproval.length > 1 ? "s" : ""} aguardando aprovação do cliente` : "Nenhuma entrega aguardando aprovação"}
          detail={needsApproval.slice(0, 3).map(d => d.title).join(" · ") || "Versões publicadas já foram revisadas"} />
        <OverviewItem icon={<CheckCircle size={17} aria-hidden="true" />} badge={myTasks.length > 0} active={myTasks.length > 0} onClick={() => onOpen("clients")}
          title={myTasks.length ? `${myTasks.length} tarefa${myTasks.length > 1 ? "s" : ""} minha${myTasks.length > 1 ? "s" : ""} em aberto` : "Nenhuma tarefa minha em aberto"}
          detail={myTasks.slice(0, 3).map(t => t.title).join(" · ") || "Tudo em dia"} />
        <OverviewItem icon={<CalendarBlank size={17} aria-hidden="true" />} badge={clientTasks.length > 0} active={clientTasks.length > 0} onClick={() => onOpen("clients")}
          title={clientTasks.length ? `${clientTasks.length} tarefa${clientTasks.length > 1 ? "s" : ""} aguardando o cliente` : "Nada aguardando o cliente"}
          detail={clientTasks.slice(0, 3).map(t => t.title).join(" · ") || "Clientes sem pendências registradas"} />
      </CardContent></Card>
      <Card><CardHeader><CardTitle><Storefront size={20} aria-hidden="true" /> Comercial</CardTitle></CardHeader><CardContent className="overview-list">
        <OverviewItem icon={<MagnifyingGlass size={17} aria-hidden="true" />} badge={waitingAnswer.length > 0} active={waitingAnswer.length > 0} onClick={() => onOpen("prospecting")}
          title={waitingAnswer.length ? `${waitingAnswer.length} oportunidade${waitingAnswer.length > 1 ? "s" : ""} sem próximo contato definido ou vencido` : "Pipeline organizado"}
          detail={waitingAnswer.slice(0, 3).map(o => o.name).join(" · ") || "Toda oportunidade tem próxima ação"} />
        <OverviewItem icon={<CalendarBlank size={17} aria-hidden="true" />} badge={nextContacts.length > 0} active={nextContacts.length > 0} onClick={() => onOpen("prospecting")}
          title={nextContacts.length ? `${nextContacts.length} contato${nextContacts.length > 1 ? "s" : ""} nos próximos dias` : "Nenhum contato agendado"}
          detail={nextContacts.slice(0, 3).map(o => `${o.name} (${dateLabel(o.next_action_date)})`).join(" · ") || "Agende retornos na aba Prospecção"} />
        <OverviewItem icon={<Storefront size={17} aria-hidden="true" />} active onClick={() => onOpen("prospecting")}
          title={`${activeOpportunities.length} oportunidade${activeOpportunities.length === 1 ? "" : "s"} em aberto`}
          detail={opportunityStages.filter(([id]) => id !== "ganho" && id !== "perdido").map(([id, label]) => ({ label, count: activeOpportunities.filter(o => o.stage === id).length })).filter(s => s.count).map(s => `${s.count} em ${s.label}`).join(" · ") || "Cadastre contatos encontrados na busca"} />
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Projetos em andamento</CardTitle></CardHeader><CardContent>
      {openProjects.length === 0 ? <p className="workspace-empty">Nenhum projeto em andamento. Cadastre um projeto na aba Clientes e projetos.</p> : <ul className="overview-projects">{openProjects.map(p => { const progress = projectProgress(p, tasks.filter(t => t.project_id === p.id), deliverables.filter(d => d.project_id === p.id)); return <li key={p.id}>
        <button onClick={() => goToProject(p.id)}>
          <span className="workspace-stage">{deliveryStages[p.stage]}</span>
          <span className="overview-project-name"><strong>{p.title}</strong><small>{clientById.get(p.client_id)?.name ?? "Cliente"}{p.next_step ? ` · ${p.next_step}` : ""}</small></span>
          <span className="overview-project-meta"><small>{(data.unread?.[p.id] ?? 0) > 0 ? <><Circle size={9} weight="fill" aria-hidden="true" /> {data.unread![p.id]} sem leitura · </> : ""}Entrega: {dateLabel(p.due_date)}{isOverdue(p.due_date) ? " (atrasada)" : isSoon(p.due_date) ? " (nesta semana)" : ""}</small><span className="workspace-mini-progress" aria-hidden="true"><i style={{ width: `${progress.percent}%` }} /></span><small>{progress.percent}% · {progress.labels[0]}</small></span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </button>
      </li>; })}</ul>}
    </CardContent></Card>
    {opportunities.length === 0 && tasks.length === 0 && deliverables.length === 0 && <Card><CardContent className="overview-empty"><NotePencil size={30} /><p>Esta visão é alimentada pelos seus registros: clientes, tarefas, entregas e oportunidades. Conforme você usar a ferramenta, os indicadores abaixo aparecem com atalhos para cada registro.</p><div className="workspace-actions"><Button onClick={() => onOpen("clients")}>Cadastrar cliente</Button><Button variant="outline" onClick={() => onOpen("prospecting")}>Abrir prospecção</Button></div></CardContent></Card>}
  </div>;
}

function OverviewItem({ icon, title, detail, active, badge, onClick }: { icon: ReactNode; title: string; detail: string; active: boolean; badge?: boolean; onClick: () => void }) {
  return <button type="button" className={badge ? "overview-item has-badge" : "overview-item"} onClick={onClick}>
    <span className="overview-item-icon" aria-hidden="true">{icon}</span>
    <span><strong>{title}</strong><small>{detail}</small></span>
    {active && <ArrowUpRight size={16} aria-hidden="true" />}
  </button>;
}
