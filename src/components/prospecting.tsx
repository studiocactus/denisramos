"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MagnifyingGlass, MapPin, Phone, ArrowUpRight, Star, Storefront, SlidersHorizontal, Plug, SpinnerGap, Globe, CheckCircle } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { countries, type Prospect, type ProspectQuery } from "@/lib/prospecting";

const initialQuery: ProspectQuery = { segment: "", location: "", country: "BR", minRating: 0, phoneOnly: false };
const segments = ["Restaurantes", "Clínicas odontológicas", "Salões de beleza", "Academias", "Oficinas mecânicas", "Pet shops", "Escritórios de contabilidade", "Lojas de roupas"];

export default function Prospecting() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [access, setAccess] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [lastQuery, setLastQuery] = useState<ProspectQuery | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [scanned, setScanned] = useState(0);
  const [searchedAt, setSearchedAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("reviews");
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/prospects", { signal: abort.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => setConfigured(data.configured === true))
      .catch(() => { if (!abort.signal.aborted) setConnectionError(true); });
    return () => { abort.abort(); controller.current?.abort(); };
  }, []);

  async function search(append = false) {
    if (inFlight.current) return;
    const submitted = append && lastQuery ? lastQuery : { ...query };
    inFlight.current = true;
    setBusy(true); setError("");
    controller.current = new AbortController();
    try {
      const response = await fetch("/api/prospects", {
        method: "POST", signal: controller.current.signal, cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
        body: JSON.stringify({ ...submitted, ...(append && nextPage ? { pageToken: nextPage } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir a busca.");
      setProspects(previous => [...new Map([...(append ? previous : []), ...data.prospects].map((item: Prospect) => [item.id, item] as const)).values()]);
      setScanned(previous => (append ? previous : 0) + data.scanned);
      setNextPage(data.nextPageToken); setLastQuery(submitted); setSearchedAt(data.searchedAt);
      if (!append) setFilter("");
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "Falha na conexão. Tente novamente.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void search(); }
  const visible = prospects.filter(item => `${item.name} ${item.address}`.toLocaleLowerCase("pt-BR").includes(filter.toLocaleLowerCase("pt-BR")))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "pt-BR") : sort === "rating" ? (b.rating ?? 0) - (a.rating ?? 0) : b.reviews - a.reviews);

  return <div className="prospecting">
    <div className="prospect-intro">
      <div><span className="prospect-kicker"><Storefront size={18} /> NOVAS CONEXÕES</span><h2>Encontre seu próximo cliente.</h2><p>Descubra negócios locais com espaço para uma presença digital melhor.</p></div>
      <span className={`prospect-connection ${configured ? "connected" : ""}`}><span />{connectionError ? "Conexão indisponível" : configured === null ? "Verificando conexão" : configured ? "Google Places conectado" : "Conexão pendente"}</span>
    </div>

    <details className="prospect-setup" open={configured === false || connectionError ? true : undefined}>
      <summary><Plug size={18} /> Acesso à busca</summary>
      {configured === false ? <p>A conexão ainda precisa ser ativada. Configure a chave do Google Places e a senha de acesso nas variáveis do projeto na Vercel. Depois, publique novamente.</p>
        : connectionError ? <p>Não foi possível verificar a conexão. Recarregue esta página para tentar novamente.</p>
        : <p>Digite a senha de prospecção definida para este admin. Ela permanece somente nesta tela e é descartada ao sair.</p>}
      <label className="field">Senha de prospecção<Input type="password" autoComplete="off" maxLength={512} value={access} onChange={event => setAccess(event.target.value)} placeholder="Sua senha de acesso à busca" /></label>
      <small>A chave do Google fica no servidor. As consultas usam a cota contratada no Google Cloud.</small>
    </details>

    <div className="prospect-workspace">
      <form className="prospect-filters" onSubmit={submit}>
        <h3><SlidersHorizontal size={20} /> Sua busca</h3>
        <label className="field">Segmento do negócio<Input required minLength={2} maxLength={100} list="prospect-segments" placeholder="Ex.: clínicas odontológicas" value={query.segment} disabled={busy} onChange={event => setQuery({ ...query, segment: event.target.value })} /></label>
        <datalist id="prospect-segments">{segments.map(segment => <option key={segment} value={segment} />)}</datalist>
        <label className="field">Cidade, bairro ou CEP<Input required minLength={2} maxLength={150} placeholder="Ex.: Gonzaga, Santos — SP" value={query.location} disabled={busy} onChange={event => setQuery({ ...query, location: event.target.value })} /></label>
        <label className="field">País<select value={query.country} disabled={busy} onChange={event => setQuery({ ...query, country: event.target.value })}>{Object.entries(countries).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
        <label className="field">Avaliação mínima<select value={query.minRating} disabled={busy} onChange={event => setQuery({ ...query, minRating: Number(event.target.value) })}><option value={0}>Qualquer avaliação</option>{[3, 3.5, 4, 4.5].map(rating => <option key={rating} value={rating}>{rating.toLocaleString("pt-BR")} estrelas ou mais</option>)}</select></label>
        <label className="checkbox-field"><input type="checkbox" checked={query.phoneOnly} disabled={busy} onChange={event => setQuery({ ...query, phoneOnly: event.target.checked })} /> Somente com telefone</label>
        <div className="prospect-fixed-filter"><Globe size={18} /><span>Sem site informado<small>Filtro aplicado a todas as buscas</small></span><CheckCircle size={18} /></div>
        <Button type="submit" disabled={busy || !configured || !access.trim()} className="prospect-search">{busy ? <SpinnerGap className="prospect-spinner" /> : <MagnifyingGlass />}{busy ? "Buscando negócios…" : "Buscar oportunidades"}</Button>
        {configured && !access.trim() && <p className="prospect-hint">Preencha a senha em “Acesso à busca” para começar.</p>}
        <p className="prospect-hint">Cada consulta analisa até 20 negócios. A quantidade de oportunidades depende dos filtros. A localização orienta a busca; não é um limite geográfico exato.</p>
      </form>

      <div className="prospect-results" aria-busy={busy}>
        <div className="prospect-metrics">
          <div><small>Negócios analisados</small><strong>{scanned}</strong></div>
          <div><small>Sem site informado</small><strong>{prospects.length}</strong></div>
          <div><small>Com telefone</small><strong>{prospects.filter(item => item.phone).length}</strong></div>
        </div>
        <div className="prospect-notice"><Globe size={20} /><p><b>Uma oportunidade para investigar.</b> A ausência de site no cadastro do Google não comprova que o negócio não tenha um. Confira o perfil antes de iniciar sua abordagem.</p></div>
        {error && <p className="prospect-error" role="alert">{error}{lastQuery && " Os resultados anteriores foram mantidos."}</p>}
        <div className="prospect-result-panel">
          <div className="prospect-result-heading"><div><h3>Oportunidades{lastQuery ? ` (${visible.length})` : ""}</h3>{lastQuery && <p>{lastQuery.segment} · {lastQuery.location} · {countries[lastQuery.country]}</p>}</div><span className="google-maps-attribution">Google Maps</span></div>
          {prospects.length > 0 && <div className="prospect-result-tools"><Input aria-label="Filtrar resultados por nome ou endereço" placeholder="Filtrar por nome ou endereço" value={filter} onChange={event => setFilter(event.target.value)} /><label className="field">Ordenar<select value={sort} onChange={event => setSort(event.target.value)}><option value="reviews">Mais avaliações</option><option value="rating">Melhor nota</option><option value="name">Nome A–Z</option></select></label></div>}
          {busy && <div className="prospect-loading" role="status"><SpinnerGap className="prospect-spinner" size={22} /> Consultando o Google Places e verificando os filtros…</div>}
          {!busy && visible.length === 0 && <div className="prospect-empty"><MagnifyingGlass size={36} /><h4>{!lastQuery ? "A próxima parceria começa aqui." : filter ? "Nenhum resultado com esse termo." : "Nenhuma oportunidade nesta busca."}</h4><p>{!lastQuery ? "Escolha um segmento e uma região para encontrar negócios sem site informado." : filter ? "Tente outro nome ou limpe o filtro de resultados." : "Experimente outra região, reduza os filtros ou consulte a próxima página, se disponível."}</p></div>}
          <div className="prospect-leads">{visible.map(item => <article className="prospect-lead" key={item.id}>
            <div className="prospect-lead-top"><div className="prospect-business-icon"><Storefront size={23} /></div><div><h4>{item.name}</h4><span className="prospect-site-status">Sem site informado</span></div><span className="prospect-rating"><Star size={15} weight="fill" />{item.rating === null ? "Sem nota" : item.rating.toLocaleString("pt-BR")}<small>{item.reviews} avaliações</small></span></div>
            <p className="prospect-address"><MapPin size={17} />{item.address}</p>
            <div className="prospect-lead-actions">{item.phone ? <a href={`tel:${item.phone.replace(/[^+\d]/g, "")}`}><Phone size={16} />{item.phone}</a> : <span>Telefone não informado</span>}<a href={item.mapsUrl} target="_blank" rel="noopener noreferrer">Conferir no Google Maps <ArrowUpRight size={17} /></a></div>
            {item.attributions.length > 0 && <small className="prospect-attributions">{item.attributions.map((attribution, i) => attribution.uri ? <a href={attribution.uri} key={i} target="_blank" rel="noopener noreferrer">{attribution.name}</a> : <span key={i}>{attribution.name}</span>)}</small>}
          </article>)}</div>
          {nextPage && <Button type="button" variant="outline" disabled={busy || !access.trim()} onClick={() => void search(true)} className="prospect-more">{busy ? "Buscando…" : "Analisar mais 20 negócios"}</Button>}
          {searchedAt && <p className="prospect-search-time">Última consulta: {new Date(searchedAt).toLocaleString("pt-BR")} · Resultados disponíveis nesta sessão.</p>}
        </div>
      </div>
    </div>
    <details className="prospect-privacy"><summary>Sobre os dados e condições de uso</summary><p>Os resultados são fornecidos pelo Google Maps. Ao buscar, o segmento e a localização informados são enviados ao Google Places. Os resultados ficam temporariamente na tela, sem gravação em uma lista de contatos. A senha autoriza a consulta no servidor e não é enviada ao Google. A hospedagem pode registrar dados técnicos das requisições.</p><p>Confira as informações antes de usá-las e respeite as preferências de contato dos negócios. A ferramenta não envia mensagens. O uso dos dados do Google está sujeito aos <a href="https://maps.google.com/help/terms_maps/" target="_blank" rel="noopener noreferrer">Termos do Google Maps</a> e à <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Política de Privacidade do Google</a>.</p></details>
  </div>;
}
