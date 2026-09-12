"use client";
import { logout } from "@/app/login/actions";
import { initialContent } from "@/lib/content";
import { validContent } from "@/lib/validate-content";
import { normalizeProjectUrl } from "@/lib/project-url";
import LogoEditor from "./logo-editor";
import ProjectGalleryEditor from "./project-gallery-editor";
import ProjectTagsEditor from "./project-tags-editor";
import Prospecting from "./prospecting";
import ClientProjectsWorkspace from "./client-projects-workspace";
import SupabaseConnection from "./supabase-connection";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { useState, useEffect, type FormEvent } from "react";
import {
  ArrowUpRight,
  SquaresFour,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Briefcase,
  CheckCircle,
  User,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brand } from "./portfolio";
import { useContent } from "./content-provider";
import type { Project, SiteContent } from "@/lib/content";
const emptyProject: Project = {
  slug: "",
  title: "",
  category: "",
  tags: [],
  year: "2026",
  color: "sand",
  description: "",
  challenge: "",
  solution: "",
  published: false,
};
export default function Dashboard() {
  const { content, save, loading, error, saving } = useContent();
  const [tab, setTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [savedToast, setSavedToast] = useState<number | null>(null);
  useEffect(() => {
    if (savedToast === null) return;
    const timer = setTimeout(() => setSavedToast(null), 4300);
    return () => clearTimeout(timer);
  }, [savedToast]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<SiteContent>(content);
  useEffect(() => setDraft(content), [content]);
  async function persist(next: SiteContent) {
    try {
      await save(next);
      setMessage("");
      setSavedToast(Date.now());
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente.");
      return false;
    }
  }
  async function saveProject(e: FormEvent) {
    e.preventDefault();
    if (!editing || galleryBusy) return;
    let website: string;
    try { website = normalizeProjectUrl(editing.website ?? ""); }
    catch { setMessage("Informe um link válido para o site, como gosafeviagens.com.br."); return; }
    const slug = editing.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setMessage("Use apenas letras minúsculas, números e hífens no endereço.");
      return;
    }
    if (
      content.projects.some((p) => p.slug === slug && p.slug !== originalSlug)
    ) {
      setMessage("Já existe um projeto com esse endereço.");
      return;
    }
    if (
      await persist({
        ...content,
        projects: originalSlug
          ? content.projects.map((p) =>
              p.slug === originalSlug ? { ...editing, slug, website } : p,
            )
          : [...content.projects, { ...editing, slug, website }],
      })
    )
      setEditing(null);
  }
  if (loading || error) return <main className="login-page"><section className="login-card"><h1>{error ? "Não foi possível carregar o painel" : "Carregando seu painel…"}</h1>{error && <><p role="alert">{error}</p><Button onClick={() => window.location.reload()}>Tentar novamente</Button></>}<Link href="/">Voltar ao site</Link></section></main>;
  return (
    <div className="dashboard">
      <div className="admin-toast-region" role="status" aria-live="polite" aria-atomic="true">
        {savedToast !== null && <div className="admin-toast" key={savedToast}><CheckCircle size={24} weight="fill" aria-hidden="true" /><span>Alterações salvas</span><button type="button" aria-label="Fechar notificação" onClick={() => setSavedToast(null)}>×</button></div>}
      </div>
      <aside className="dashboard-sidebar">
        <Brand />
        <span className="workspace-label">
          PAINEL ADMINISTRATIVO
        </span>
        <nav aria-label="Navegação do painel">
          <>
              {[
                ["overview", "Visão geral", SquaresFour],
                ["content", "Conteúdo do site", PencilSimple],
                ["projects", "Portfólio", Briefcase],
                ["clients", "Clientes e projetos", User],
                ["prospecting", "Prospecção", MagnifyingGlass],
              ].map(([id, label, Icon]) => (
                <button
                  key={String(id)}
                  className={tab === id ? "selected" : ""}
                  onClick={() => {
                    setTab(String(id));
                    setMessage("");
                    setEditing(null);
                  }}
                >
                  {typeof Icon !== "string" && <Icon />}
                  {String(label)}
                </button>
              ))}
            </>
        </nav>
        <div className="sidebar-bottom">
          <Button asChild variant="outline"><Link href="/">
            Ver o site <ArrowUpRight />
          </Link></Button>
          <Button asChild variant="outline"><Link href="/cliente">
            Área do cliente{" "}
            <ArrowUpRight />
          </Link></Button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <span>
            Seu portfólio, do seu jeito.
          </span>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className="avatar admin-account-trigger" aria-label="Abrir menu da conta">DR</button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="admin-account-menu" align="end" sideOffset={8}>
                <DropdownMenu.Label className="admin-account-label">Minha conta</DropdownMenu.Label>
                <form action={logout}>
                  <DropdownMenu.Item asChild>
                    <button type="submit" className="admin-account-logout">Sair / Desconectar</button>
                  </DropdownMenu.Item>
                </form>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </header>
        <main className="dashboard-content">
          {(tab !== "prospecting" && tab !== "clients") && <div className="demo-banner">
            <span className="status-dot" />
            <p>
              <strong>Conteúdo conectado.</strong>{" "}
              Ao salvar, os textos e os projetos publicados ficam disponíveis no site. Projetos em rascunho permanecem restritos ao painel.
            </p>
          </div>}
          {message && (
            <div role="status" className="save-message">
              {message}
            </div>
          )}
          <>
              <div className="dashboard-title">
                <div>
                  <p className="eyebrow">DENIS RAMOS / ADMIN</p>
                  <h1>
                    {tab === "content"
                      ? "Conteúdo do site"
                      : tab === "projects"
                        ? "Seus trabalhos"
                        : tab === "clients" ? "Clientes e projetos" : tab === "prospecting" ? "Prospecção de clientes" : "Visão geral"}
                  </h1>
                  <p>
                    {tab === "content"
                      ? "Ajuste os textos e a forma como você se apresenta."
                      : tab === "projects"
                        ? "Organize os projetos que contam sua história."
                        : tab === "clients" ? "Acompanhe os trabalhos de cada cliente em um só lugar." : tab === "prospecting" ? "Encontre negócios com potencial para o seu próximo projeto." : "Um espaço para cuidar da sua presença digital."}
                  </p>
                </div>
                {tab === "projects" && !editing && (
                  <Button
                    onClick={() => {
                      setEditing({ ...emptyProject });
                      setOriginalSlug(null);
                      setMessage("");
                    }}
                  >
                    <Plus /> Novo projeto
                  </Button>
                )}
              </div>
              {tab === "prospecting" && <Prospecting />}
              {tab === "clients" && <ClientProjectsWorkspace admin />}
              {tab === "overview" && (
                <>
                  <div className="dashboard-stats">
                    {[
                      [String(content.projects.length), "Projetos cadastrados"],
                      [
                        String(
                          content.projects.filter((p) => p.published).length,
                        ),
                        "Publicados no portfólio",
                      ],
                    ].map(([n, label]) => (
                      <Card key={label}>
                        <CardContent className="pt-6">
                          <span className="stat-number">{n}</span>
                          <p>{label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="dashboard-columns">
                    <Card>
                      <CardHeader>
                        <CardTitle>Continue de onde parou</CardTitle>
                      </CardHeader>
                      <CardContent className="quick-actions">
                        <button onClick={() => setTab("content")}>
                          <PencilSimple />
                          <span>
                            Personalize seus textos
                            <small>Hero, apresentação e contato</small>
                          </span>
                          <ArrowUpRight />
                        </button>
                        <button onClick={() => setTab("projects")}>
                          <Briefcase />
                          <span>
                            Adicione um novo trabalho
                            <small>Uma nova história para contar</small>
                          </span>
                          <ArrowUpRight />
                        </button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle>Clientes e projetos</CardTitle></CardHeader>
                      <CardContent><p className="muted">Cadastre clientes, adicione projetos e compartilhe etapas, prazos e entregas.</p><Button onClick={() => setTab("clients")}><User /> Gerenciar clientes</Button></CardContent>
                    </Card>
                  </div>
                  <SupabaseConnection />
                </>
              )}
              {tab === "content" && (
                <Card>
                  <CardContent className="pt-6">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        persist(draft);
                      }}
                      className="editor-form"
                    >
                      <label className="field">
                        Título principal
                        <Input
                          required
                          maxLength={150}
                          value={draft.headline}
                          onChange={(e) =>
                            setDraft({ ...draft, headline: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Introdução
                        <Textarea
                          required
                          maxLength={350}
                          value={draft.intro}
                          onChange={(e) =>
                            setDraft({ ...draft, intro: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Sobre mim
                        <Textarea
                          required
                          maxLength={1500}
                          value={draft.about}
                          onChange={(e) =>
                            setDraft({ ...draft, about: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        E-mail para orçamentos
                        <Input
                          type="email"
                          placeholder="Adicione seu e-mail de contato"
                          value={draft.email}
                          onChange={(e) =>
                            setDraft({ ...draft, email: e.target.value })
                          }
                        />
                        <small>
                          O botão de orçamento abrirá este endereço no
                          aplicativo de e-mail.
                        </small>
                      </label>
                      <fieldset className="editor-group"><legend>Como eu trabalho</legend>{draft.process.map((step,i)=><div className="two-fields" key={i}><label className="field">Etapa {i+1}<Input required maxLength={60} value={step.title} onChange={e=>setDraft({...draft,process:draft.process.map((p,n)=>n===i?{...p,title:e.target.value}:p)})}/></label><label className="field">Descrição<Textarea required maxLength={200} value={step.description} onChange={e=>setDraft({...draft,process:draft.process.map((p,n)=>n===i?{...p,description:e.target.value}:p)})}/></label></div>)}</fieldset>
                      <fieldset className="editor-group"><legend>Informações pessoais</legend>{draft.personal.map((item,i)=><div className="two-fields" key={i}><label className="field">Rótulo {i+1}<Input required maxLength={40} value={item.label} onChange={e=>setDraft({...draft,personal:draft.personal.map((p,n)=>n===i?{...p,label:e.target.value}:p)})}/></label><label className="field">Informação<Input required maxLength={120} value={item.value} onChange={e=>setDraft({...draft,personal:draft.personal.map((p,n)=>n===i?{...p,value:e.target.value}:p)})}/></label></div>)}</fieldset>
                      <fieldset className="editor-group"><legend>Localização e redes sociais</legend><label className="field">Local onde moro agora<Input required maxLength={150} value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})}/></label>{draft.socials.map((social,i)=><label key={i} className="field">{social.label}<Input type="url" pattern="https?://.*" placeholder="https://" value={social.url} onChange={e=>setDraft({...draft,socials:draft.socials.map((s,n)=>n===i?{...s,url:e.target.value}:s)})}/></label>)}</fieldset>
                      <LogoEditor logos={draft.clientLogos} onChange={clientLogos=>setDraft({...draft,clientLogos})}/>
                      <div className="form-actions">
                        <Button type="button" variant="outline" disabled={saving} onClick={() => {
                          try {
                            const raw = localStorage.getItem("denis-portfolio-demo-v1");
                            if (!raw) { setMessage("Não há conteúdo da versão local neste navegador."); return; }
                            const previous = { ...initialContent, ...JSON.parse(raw) };
                            if (!validContent(previous)) throw new Error();
                            setDraft(previous);
                            setMessage("Conteúdo local recuperado para revisão, incluindo os projetos. Clique em Salvar no site para publicar.");
                          } catch { setMessage("Não foi possível recuperar o conteúdo local. Os dados originais permanecem no navegador."); }
                        }}>Recuperar edições deste navegador</Button>
                        <Button type="submit" disabled={saving}>
                          <CheckCircle /> {saving ? "Salvando…" : "Salvar no site"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setDraft(content);
                            setMessage("Edições não salvas descartadas.");
                          }}
                        >
                          Descartar alterações
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
              {tab === "projects" &&
                (editing ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {originalSlug ? "Editar projeto" : "Novo projeto"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={saveProject} className="editor-form">
                        <div className="two-fields">
                          <label className="field">
                            Nome
                            <Input
                              required
                              maxLength={80}
                              value={editing.title}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  title: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            Endereço interno no portfólio
                            <Input
                              required
                              pattern="[a-z0-9]+(-[a-z0-9]+)*"
                              placeholder="nome-do-projeto"
                              title="Use apenas letras minúsculas, números e hífens. Ex.: gosafe-viagens"
                              value={editing.slug}
                              onChange={(e) =>
                                setEditing({ ...editing, slug: e.target.value })
                              }
                            />
                          </label>
                        </div>
                        <div className="two-fields">
                          <label className="field">
                            Categoria
                            <Input
                              required
                              value={editing.category}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  category: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            Ano
                            <Input
                              required
                              pattern="[0-9]{4}"
                              value={editing.year}
                              onChange={(e) =>
                                setEditing({ ...editing, year: e.target.value })
                              }
                            />
                          </label>
                        </div>
                        <div className="two-fields">
                          <label className="field">País<Input maxLength={100} placeholder="Ex.: Brasil" value={editing.country ?? ""} onChange={e => setEditing({ ...editing, country: e.target.value })} /></label>
                          <label className="field">Duração<Input maxLength={100} placeholder="Ex.: 30 dias" value={editing.duration ?? ""} onChange={e => setEditing({ ...editing, duration: e.target.value })} /></label>
                        </div>
                        <label className="field">
                          Link do site do projeto
                          <Input maxLength={2000} placeholder="Ex.: gosafeviagens.com.br" value={editing.website ?? ""}
                            onChange={e => setEditing({ ...editing, website: e.target.value })} />
                          <small>Opcional. Aceita com ou sem https:// e aparece como “Visitar site” na página do projeto.</small>
                        </label>
                        <ProjectTagsEditor tags={editing.tags ?? []}
                          onChange={tags => setEditing(current => current ? { ...current, tags } : current)} />
                        {[
                          ["description", "Resumo"],
                          ["challenge", "O desafio"],
                          ["solution", "A solução"],
                        ].map(([key, label]) => (
                          <label className="field" key={key}>
                            {label}
                            <Textarea
                              required
                              maxLength={3000}
                              value={String(editing[key as keyof Project])}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  [key]: e.target.value,
                                })
                              }
                            />
                          </label>
                        ))}
                        <div className="two-fields">
                          <label className="field">
                            Capa conceitual
                            <select
                              value={editing.color}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  color: e.target.value,
                                })
                              }
                            >
                              <option value="sand">Forma · Areia</option>
                              <option value="lime">Orbit · Lima</option>
                              <option value="clay">Essência · Terracota</option>
                            </select>
                          </label>
                          <label className="checkbox-field">
                            <input
                              type="checkbox"
                              checked={editing.published}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  published: e.target.checked,
                                })
                              }
                            />{" "}
                            Visível no site para todos os visitantes
                          </label>
                        </div>
                        <ProjectGalleryEditor cover disabled={galleryBusy || saving} images={editing.cover ? [editing.cover] : []} onBusyChange={setGalleryBusy} onChange={images => setEditing(current => current ? { ...current, cover: images[0] } : current)} />
                        <ProjectGalleryEditor cover internal disabled={galleryBusy || saving} images={editing.detailCover ? [editing.detailCover] : []} onBusyChange={setGalleryBusy} onChange={images => setEditing(current => current ? { ...current, detailCover: images[0] } : current)} />
                        <ProjectGalleryEditor disabled={galleryBusy || saving} images={editing.images ?? []} onBusyChange={setGalleryBusy} onChange={images => setEditing(current => current ? { ...current, images } : current)} />
                        <div className="form-actions">
                          <Button type="submit" disabled={saving || galleryBusy}>Salvar projeto</Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditing(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="project-table">
                      {content.projects.length === 0 ? (
                        <p>
                          Nenhum projeto cadastrado. Crie seu primeiro trabalho.
                        </p>
                      ) : (
                        content.projects.map((p) => (
                          <div className="project-row" key={p.slug}>
                            <span className={`project-swatch ${p.color}`}>
                              {p.title.slice(0, 1)}
                            </span>
                            <div>
                              <strong>{p.title}</strong>
                              <small>{p.category}</small>
                            </div>
                            <Badge
                              variant={p.published ? "default" : "secondary"}
                            >
                              {p.published ? "Visível" : "Rascunho"}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Editar ${p.title}`}
                              onClick={() => {
                                setEditing({ ...p });
                                setOriginalSlug(p.slug);
                              }}
                            >
                              <PencilSimple />
                            </Button>
                            {p.published && (
                              <Button size="icon" variant="ghost" asChild>
                                <Link
                                  href={`/projetos/${p.slug}`}
                                  aria-label={`Abrir ${p.title}`}
                                >
                                  <ArrowUpRight />
                                </Link>
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                ))}
          </>
        </main>
      </div>
    </div>
  );
}
