"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowClockwise, CheckCircle, MagnifyingGlass, NotePencil, PencilSimple, Plus, Star, Trash } from "@phosphor-icons/react";
import { opportunityStages, type Opportunity, type OpportunityStage } from "@/lib/client-projects";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";

const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "medium" }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : "A definir";
const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (value: string | null) => !!value && value < today();
const money = (value: string | null) => value ? Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
const sources = ["Google Places", "Indicação", "Instagram", "LinkedIn", "Site portfólio", "Evento", "Outro"];

export default function OpportunityPipeline({ active }: { active: boolean }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Opportunity | "new" | null>(null);
  const [converting, setConverting] = useState<Opportunity | null>(null);
  const [deleting, setDeleting] = useState<Opportunity | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("open");
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/workspace?admin=1", { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok) { setSetup(!!result.setupRequired); throw new Error(result.error); }
      setOpportunities(result.opportunities ?? []); setSetup(false); setError("");
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : "Não foi possível carregar as oportunidades."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { if (!active) return; const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [active, load]);

  async function save(payload: Record<string, unknown>) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
      setNotice(payload.action === "convert_opportunity" ? "Oportunidade convertida em cliente e projeto. O histórico foi preservado." : "Oportunidade salva.");
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); return false; }
    finally { setBusy(false); }
  }

  const sourcesList = [...new Set(opportunities.map(o => o.source).filter(Boolean))];
  const visible = opportunities
    .filter(o => stageFilter === "open" ? o.stage !== "ganho" && o.stage !== "perdido" : stageFilter === "all" ? true : o.stage === stageFilter)
    .filter(o => !sourceFilter || o.source === sourceFilter)
    .filter(o => `${o.name} ${o.company} ${o.email}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const totals = {
    estimated: visible.reduce((a, o) => a + (o.estimated_value ? Number(o.estimated_value) : 0), 0),
    proposed: visible.filter(o => ["proposta_enviada", "negociacao", "ganho"].includes(o.stage)).reduce((a, o) => a + (o.proposal_value ? Number(o.proposal_value) : 0), 0),
  };
  if (loading) return <p role="status" className="workspace-empty">Carregando funil comercial…</p>;
  return <Card className="pipeline"><CardContent>
    <div className="workspace-section-heading"><div><h2><MagnifyingGlass size={22} aria-hidden="true" /> Funil comercial</h2><p className="muted">Acompanhe cada oportunidade da primeira conversa até o projeto assinado.</p></div><Button disabled={busy || setup} onClick={() => setEditing("new")}><Plus /> Nova oportunidade</Button></div>
    {setup && <div className="workspace-notice" role="alert"><p>Execute a migração <code>202610180001_workspace_pipeline.sql</code> no Supabase para ativar o funil comercial.</p></div>}
    {error && <div className="workspace-notice" role="alert"><p>{error}</p><Button variant="outline" disabled={busy} onClick={() => void load()}><ArrowClockwise /> Tentar novamente</Button></div>}
    {notice && <p className="workspace-notice" role="status">{notice}</p>}
    {editing && <OpportunityEditor opportunity={editing === "new" ? null : editing} busy={busy} onCancel={() => setEditing(null)} onSave={async payload => { if (await save(payload)) setEditing(null); }} />}
    {converting && <ConvertForm opportunity={converting} busy={busy} onCancel={() => setConverting(null)} onConfirm={async payload => { if (await save({ action: "convert_opportunity", id: converting.id, ...payload })) { setConverting(null); setStageFilter("all"); } }} />}
    {deleting && <div className="workspace-notice" role="group" aria-label="Confirmar exclusão da oportunidade"><strong>Excluir “{deleting.name}”?</strong><p>A oportunidade deixará de aparecer no funil. Esta ação não pode ser desfeita.</p><div className="workspace-actions"><Button variant="destructive" disabled={busy} onClick={async () => { if (await save({ action: "delete_opportunity", id: deleting.id, version: deleting.updated_at })) setDeleting(null); }}>{busy ? "Excluindo…" : "Confirmar exclusão"}</Button><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</Button></div></div>}
    <div className="workspace-filters">
      <label className="field">Etapa<select value={stageFilter} onChange={e => setStageFilter(e.target.value)}><option value="open">Em aberto</option><option value="all">Todas</option>{opportunityStages.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className="field">Origem<select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}><option value="">Todas</option>{sourcesList.map(source => <option key={source} value={source}>{source}</option>)}</select></label>
      <label className="field">Buscar<Input placeholder="Nome, empresa ou e-mail" value={search} onChange={e => setSearch(e.target.value)} /></label>
    </div>
    {(totals.estimated > 0 || totals.proposed > 0) && <p className="pipeline-totals">{totals.estimated > 0 && <span>Valores previstos nos resultados: <strong>{money(String(totals.estimated))}</strong></span>}{totals.proposed > 0 && <span>Propostas enviadas ou aceitas: <strong>{money(String(totals.proposed))}</strong></span>}<small>Somente valores registrados por você; não há controle de recebimento.</small></p>}
    {visible.length === 0 ? <div className="workspace-empty"><MagnifyingGlass size={36} /><h3>Nenhuma oportunidade aqui</h3><p>{opportunities.length ? "Ajuste os filtros ou cadastre uma nova oportunidade." : "Salve negócios da aba Buscar ou cadastre contatos manualmente."}</p></div> : <ul className="pipeline-list">{visible.map(o => <li key={o.id} className={o.stage === "perdido" ? "is-lost" : o.stage === "ganho" ? "is-won" : undefined}>
      <div className="pipeline-card-head"><div><strong>{o.name}</strong>{o.company && <small>{o.company}</small>}</div><span className={`workspace-status pipeline-stage-${o.stage}`}>{opportunityStages.find(([id]) => id === o.stage)?.[1]}</span></div>
      <dl className="pipeline-meta">
        <div><dt>Próxima ação</dt><dd className={isOverdue(o.next_action_date) ? "workspace-overdue" : ""}>{o.next_action ? `${o.next_action}${o.next_action_date ? ` · ${dateLabel(o.next_action_date)}` : ""}` : "Não definida"}{isOverdue(o.next_action_date) ? " · atrasada" : ""}</dd></div>
        {o.service_interest && <div><dt>Serviço de interesse</dt><dd>{o.service_interest}</dd></div>}
        {o.email && <div><dt>Contato</dt><dd>{o.email}{o.phone ? ` · ${o.phone}` : ""}</dd></div>}
        {o.source && <div><dt>Origem</dt><dd>{o.source}</dd></div>}
        {o.estimated_value && <div><dt>Valor previsto</dt><dd>{money(o.estimated_value)}</dd></div>}
        {o.proposal_value && <div><dt>Proposta</dt><dd>{money(o.proposal_value)}</dd></div>}
        {o.stage === "perdido" && o.lost_reason && <div><dt>Motivo da perda</dt><dd>{o.lost_reason}</dd></div>}
      </dl>
      {o.need && <p className="pipeline-need">{o.need}</p>}
      {o.notes && <p className="pipeline-notes"><NotePencil size={15} aria-hidden="true" /> {o.notes}</p>}
      {o.converted_at && <p className="workspace-approval"><Star size={15} weight="fill" aria-hidden="true" /> Convertida em {dateLabel(o.converted_at)}{o.project_id ? " · projeto criado" : ""}</p>}
      <div className="workspace-actions">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(o)}><PencilSimple size={16} /> Editar</Button>
        {!["ganho", "perdido"].includes(o.stage) && <Button size="sm" disabled={busy} onClick={() => setConverting(o)}><CheckCircle size={16} /> Converter em cliente e projeto</Button>}
        {o.stage !== "perdido" && o.stage !== "ganho" && <label className="field pipeline-stage-field">Mover para<select disabled={busy} value={o.stage} onChange={async e => { const stage = e.target.value as OpportunityStage; if (stage === "perdido") { setEditing(o); return; } await save({ action: "opportunity", id: o.id, version: o.updated_at, ...pickFields(o), stage }); }}><option value="" disabled>Etapa…</option>{opportunityStages.filter(([id]) => id !== "ganho").map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}
        {o.stage !== "ganho" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDeleting(o)}><Trash size={16} /> Excluir</Button>}
      </div>
    </li>)}</ul>}
  </CardContent></Card>;
}

function pickFields(o: Opportunity) {
  return { name: o.name, company: o.company, email: o.email, phone: o.phone, source: o.source, service_interest: o.service_interest, need: o.need, estimated_value: o.estimated_value, proposal_value: o.proposal_value, notes: o.notes, next_action: o.next_action, next_action_date: o.next_action_date };
}

function OpportunityEditor({ opportunity, busy, onCancel, onSave }: { opportunity: Opportunity | null; busy: boolean; onCancel: () => void; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [stage, setStage] = useState<OpportunityStage>(opportunity?.stage ?? "novo_contato");
  return <Card className="workspace-editor"><CardContent><h3>{opportunity ? "Editar oportunidade" : "Nova oportunidade"}</h3><form className="editor-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget)); await onSave({ ...fields, action: "opportunity", id: opportunity?.id ?? null, version: opportunity?.updated_at ?? null, stage }); }}>
    <fieldset disabled={busy}>
      <div className="two-fields"><label className="field">Nome do contato ou negócio<Input name="name" required maxLength={120} defaultValue={opportunity?.name ?? ""} /></label><label className="field">Empresa<Input name="company" maxLength={160} defaultValue={opportunity?.company ?? ""} /></label></div>
      <div className="two-fields"><label className="field">E-mail<Input name="email" type="email" maxLength={254} defaultValue={opportunity?.email ?? ""} /><small>Necessário para converter em cliente.</small></label><label className="field">Telefone<Input name="phone" type="tel" maxLength={40} defaultValue={opportunity?.phone ?? ""} /></label></div>
      <div className="two-fields"><label className="field">Origem<select name="source" defaultValue={opportunity?.source ?? "Google Places"}>{[...new Set([...sources, opportunity?.source].filter(Boolean))].map(source => <option key={String(source)} value={String(source)}>{source}</option>)}</select></label><label className="field">Serviço de interesse<Input name="service_interest" maxLength={160} defaultValue={opportunity?.service_interest ?? ""} placeholder="Ex.: site institucional" /></label></div>
      <label className="field">Necessidade<Textarea name="need" maxLength={3000} defaultValue={opportunity?.need ?? ""} placeholder="O que o negócio precisa…" /></label>
      <div className="two-fields"><label className="field">Etapa<select value={stage} onChange={e => setStage(e.target.value as OpportunityStage)}>{opportunityStages.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>{stage === "perdido" ? <label className="field">Motivo da perda<Input name="lost_reason" maxLength={500} defaultValue={opportunity?.lost_reason ?? ""} required /></label> : <label className="field">Próxima ação<Input name="next_action" maxLength={300} defaultValue={opportunity?.next_action ?? ""} placeholder="Ex.: ligar na segunda-feira" /></label>}</div>
      {stage !== "perdido" && <label className="field">Data do próximo contato<Input name="next_action_date" type="date" defaultValue={opportunity?.next_action_date ?? ""} /></label>}
      <div className="two-fields"><label className="field">Valor previsto (R$)<Input name="estimated_value" inputMode="decimal" maxLength={13} defaultValue={opportunity?.estimated_value ?? ""} placeholder="Ex.: 4500.00" /></label><label className="field">Valor da proposta (R$)<Input name="proposal_value" inputMode="decimal" maxLength={13} defaultValue={opportunity?.proposal_value ?? ""} placeholder="Preencha ao enviar a proposta" /></label></div>
      <label className="field">Anotações<Textarea name="notes" maxLength={3000} defaultValue={opportunity?.notes ?? ""} placeholder="Histórico de conversas, combinados…" /></label>
      <div className="workspace-actions"><Button type="submit">{busy ? "Salvando…" : "Salvar oportunidade"}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button></div>
    </fieldset>
  </form></CardContent></Card>;
}

function ConvertForm({ opportunity, busy, onCancel, onConfirm }: { opportunity: Opportunity; busy: boolean; onCancel: () => void; onConfirm: (payload: Record<string, unknown>) => Promise<void> }) {
  const [error, setError] = useState("");
  return <Card className="workspace-editor"><CardContent><h3>Converter “{opportunity.name}”</h3>
    {!opportunity.email ? <div className="workspace-notice" role="alert"><p>Cadastre o e-mail do contato antes de converter. O e-mail identifica o cliente e permite o acesso à área dele.</p><Button variant="outline" onClick={onCancel}>Voltar</Button></div>
      : <form className="editor-form" onSubmit={async event => { event.preventDefault(); setError(""); const fields = Object.fromEntries(new FormData(event.currentTarget)); await onConfirm({ title: String(fields.title), start_date: String(fields.start_date ?? ""), due_date: String(fields.due_date ?? "") }); }}>
        <p className="muted">Um cliente e um projeto serão criados com os dados desta oportunidade. Se já existir um cliente com o e-mail <strong>{opportunity.email}</strong>, o projeto será vinculado a ele — sem cadastro duplicado.</p>
        {opportunity.need && <p className="pipeline-need">A necessidade registrada virará o resumo inicial do projeto.</p>}
        <label className="field">Título do projeto<Input name="title" required maxLength={160} defaultValue={opportunity.service_interest ? `${opportunity.service_interest} · ${opportunity.company || opportunity.name}` : `${opportunity.name}`} /></label>
        <div className="two-fields"><label className="field">Data de início<Input name="start_date" type="date" defaultValue={today()} /></label><label className="field">Previsão de entrega (opcional)<Input name="due_date" type="date" /></label></div>
        {error && <p role="alert">{error}</p>}
        <div className="workspace-actions"><Button type="submit" disabled={busy}>{busy ? "Convertendo…" : "Confirmar conversão"}</Button><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancelar</Button></div>
      </form>}
  </CardContent></Card>;
}
