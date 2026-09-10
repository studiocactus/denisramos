"use client";
import LogoEditor from "./logo-editor";
import Prospecting from "./prospecting";
import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import {
  ArrowUpRight,
  SquaresFour,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Briefcase,
  CheckCircle,
  Clock,
  Paperclip,
  ArrowLeft,
  Trash,
  DownloadSimple,
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
const stages = [
  "Briefing",
  "Design",
  "Desenvolvimento",
  "Em revisão",
  "Concluído",
];
function useStatus() {
  const [status, setStatus] = useState("Em revisão");
  useEffect(() => {
    const saved = localStorage.getItem("denis-demo-status");
    if (saved && stages.includes(saved)) setStatus(saved);
  }, []);
  return {
    status,
    change: (value: string) => {
      localStorage.setItem("denis-demo-status", value);
      setStatus(value);
    },
  };
}
export default function Dashboard({ client = false }: { client?: boolean }) {
  const { content, save, reset } = useContent();
  const [tab, setTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Project | null>(null);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<SiteContent>(content);
  const { status, change } = useStatus();
  useEffect(() => setDraft(content), [content]);
  function persist(next: SiteContent) {
    try {
      save(next);
      setMessage("Alterações salvas neste navegador.");
      return true;
    } catch {
      setMessage(
        "Não foi possível salvar. Verifique o espaço ou as permissões do navegador.",
      );
      return false;
    }
  }
  function saveProject(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
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
      persist({
        ...content,
        projects: originalSlug
          ? content.projects.map((p) =>
              p.slug === originalSlug ? { ...editing, slug } : p,
            )
          : [...content.projects, { ...editing, slug }],
      })
    )
      setEditing(null);
  }
  return (
    <div className="dashboard">
      <aside className="dashboard-sidebar">
        <Brand />
        <span className="workspace-label">
          {client ? "ESPAÇO DO CLIENTE" : "PAINEL ADMINISTRATIVO"}
        </span>
        <nav aria-label="Navegação do painel">
          {client ? (
            <button className="selected">
              <Briefcase /> Meu projeto
            </button>
          ) : (
            <>
              {[
                ["overview", "Visão geral", SquaresFour],
                ["content", "Conteúdo do site", PencilSimple],
                ["projects", "Portfólio", Briefcase],
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
          )}
        </nav>
        <div className="sidebar-bottom">
          <Badge variant="outline">{tab === "prospecting" && !client ? "Ferramentas de negócio" : "Versão demonstrativa"}</Badge>
          <Link href="/">
            Ver o site <ArrowUpRight />
          </Link>
          <Link href={client ? "/admin" : "/cliente"}>
            {client ? "Painel administrativo" : "Área do cliente"}{" "}
            <ArrowUpRight />
          </Link>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <span>
            {client
              ? "Seu espaço de colaboração"
              : "Seu portfólio, do seu jeito."}
          </span>
          <span className="avatar">{client ? "CL" : "DR"}</span>
        </header>
        <main className="dashboard-content">
          {(client || tab !== "prospecting") && <div className="demo-banner">
            <span className="status-dot" />
            <p>
              <strong>Ambiente de demonstração.</strong>{" "}
              {client
                ? "Explore o fluxo com um projeto fictício. Comentários ficam neste navegador; anexos duram apenas nesta sessão. Nada é enviado."
                : "As edições aparecem apenas neste navegador. Publicação compartilhada, login e permissões serão conectados ao Supabase."}
            </p>
          </div>}
          {message && (
            <div role="status" className="save-message">
              {message}
            </div>
          )}
          {client ? (
            <ClientWorkspace status={status} />
          ) : (
            <>
              <div className="dashboard-title">
                <div>
                  <p className="eyebrow">DENIS RAMOS / ADMIN</p>
                  <h1>
                    {tab === "content"
                      ? "Conteúdo do site"
                      : tab === "projects"
                        ? "Seus trabalhos"
                        : tab === "prospecting" ? "Prospecção de clientes" : "Visão geral"}
                  </h1>
                  <p>
                    {tab === "content"
                      ? "Ajuste os textos e a forma como você se apresenta."
                      : tab === "projects"
                        ? "Organize os projetos que contam sua história."
                        : tab === "prospecting" ? "Encontre negócios com potencial para o seu próximo projeto." : "Um espaço para cuidar da sua presença digital."}
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
              {tab === "overview" && (
                <>
                  <div className="dashboard-stats">
                    {[
                      [String(content.projects.length), "Projetos cadastrados"],
                      [
                        String(
                          content.projects.filter((p) => p.published).length,
                        ),
                        "Visíveis na demonstração",
                      ],
                      ["1", "Projeto de cliente fictício"],
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
                      <CardHeader>
                        <CardTitle>Projeto do cliente · demonstração</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="muted">
                          Website institucional — Projeto exemplo
                        </p>
                        <label className="field">
                          Etapa atual
                          <select
                            value={status}
                            onChange={(e) => {
                              try {
                                change(e.target.value);
                                setMessage(
                                  "Etapa atualizada na demonstração local.",
                                );
                              } catch {
                                setMessage("Não foi possível salvar a etapa.");
                              }
                            }}
                          >
                            {stages.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </label>
                        <Link className="text-link" href="/cliente">
                          Abrir área do cliente <ArrowUpRight />
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="mt-6">
                    <CardContent className="pt-6">
                      <h2 className="panel-subtitle">
                        Próxima etapa: conectar seu Supabase
                      </h2>
                      <p className="muted">
                        Autenticação, armazenamento de arquivos, permissões por
                        cliente e conteúdo compartilhado serão implementados
                        quando o banco estiver disponível.
                      </p>
                    </CardContent>
                  </Card>
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
                        <Button type="submit">
                          <CheckCircle /> Salvar neste navegador
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
                            Endereço do projeto
                            <Input
                              required
                              pattern="[a-z0-9]+(-[a-z0-9]+)*"
                              placeholder="nome-do-projeto"
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
                        <label className="field">
                          Tags do trabalho (separadas por vírgulas)
                          <Input maxLength={300} placeholder="Ex.: Figma, Next.js, Supabase"
                            value={(editing.tags ?? []).join(",")}
                            onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",") })} />
                        </label>
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
                            Visível na home deste navegador
                          </label>
                        </div>
                        <div className="form-actions">
                          <Button type="submit">Salvar projeto</Button>
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
          )}
          {(client || tab !== "prospecting") && <p className="dashboard-footnote">
            Protótipo inicial ·{" "}
            {client
              ? "Nenhum arquivo ou comentário é entregue ao designer."
              : "Nenhum dado real de cliente é exibido aqui."}
          </p>}
        </main>
      </div>
    </div>
  );
}
function ClientWorkspace({ status }: { status: string }) {
  const [comments, setComments] = useState<{ text: string; date: string }[]>(
    [],
  );
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem("denis-demo-comments") || "[]",
      );
      if (
        Array.isArray(data) &&
        data.every(
          (c) => typeof c.text === "string" && typeof c.date === "string",
        )
      )
        setComments(data);
    } catch {}
  }, []);
  function comment(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const next = [
      ...comments,
      { text: text.trim(), date: new Date().toLocaleString("pt-BR") },
    ];
    try {
      localStorage.setItem("denis-demo-comments", JSON.stringify(next));
      setComments(next);
      setText("");
      setNotice("Comentário adicionado somente à demonstração local.");
    } catch {
      setNotice("Não foi possível salvar o comentário no navegador.");
    }
  }
  const index = stages.indexOf(status);
  return (
    <>
      <div className="dashboard-title">
        <div>
          <p className="eyebrow">MEU PROJETO / DEMONSTRAÇÃO</p>
          <h1>Website institucional</h1>
          <p>Acompanhe cada etapa. Vamos construir juntos.</p>
        </div>
        <Badge>{status}</Badge>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="progress-heading">
            <h2 className="panel-subtitle">Seu projeto está evoluindo</h2>
            <span>{Math.round(((index + 1) / stages.length) * 100)}%</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Progresso do projeto de demonstração"
            aria-valuenow={Math.round(((index + 1) / stages.length) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div style={{ width: `${((index + 1) / stages.length) * 100}%` }} />
          </div>
          <div className="stages">
            {stages.map((s, i) => (
              <span className={i <= index ? "done" : ""} key={s}>
                {i < index ? <CheckCircle weight="fill" /> : <Clock />}
                {s}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="dashboard-columns mt-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Entrega para revisão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="delivery-preview">
                <span>DR.</span>
                <p>
                  Uma nova presença.
                  <br />A mesma essência.
                </p>
                <small>DIREÇÃO VISUAL / V01</small>
              </div>
              <h3 className="delivery-title">Direção visual da home</h3>
              <p className="muted">
                Exemplo de entrega. Confira a apresentação e deixe suas
                observações ao lado.
              </p>
              <Button variant="outline" asChild>
                <Link href="/">
                  Visualizar demonstração <ArrowUpRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Seus arquivos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="muted">
                Anexe referências para experimentar o fluxo. Até 10 MB por
                arquivo, 5 arquivos por sessão. Os arquivos não são enviados nem
                preservados ao sair.
              </p>
              <label className="upload-zone">
                <Paperclip size={24} />
                <span>Selecionar arquivos</span>
                <input
                  type="file"
                  multiple
                  aria-label="Selecionar arquivos para demonstração"
                  onChange={(e) => {
                    const added = Array.from(e.target.files || []);
                    if (added.some((f) => f.size > 10 * 1024 * 1024)) {
                      setNotice("Cada arquivo deve ter no máximo 10 MB.");
                      return;
                    }
                    if (files.length + added.length > 5) {
                      setNotice("Use no máximo 5 arquivos nesta sessão.");
                      return;
                    }
                    setFiles([...files, ...added]);
                    setNotice(
                      "Arquivos anexados apenas nesta sessão. Nada foi enviado.",
                    );
                    e.target.value = "";
                  }}
                />
              </label>
              {files.map((file, i) => (
                <div className="file-row" key={`${file.name}-${i}`}>
                  <Paperclip />
                  <span>
                    {file.name}
                    <small>{(file.size / 1024).toFixed(0)} KB · local</small>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Baixar ${file.name}`}
                    onClick={() => {
                      const url = URL.createObjectURL(file);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = file.name;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    <DownloadSimple />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${file.name}`}
                    onClick={() => setFiles(files.filter((_, n) => n !== i))}
                  >
                    <Trash />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card className="comments-card">
          <CardHeader>
            <CardTitle>Vamos conversar sobre a entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="designer-comment">
              <span className="avatar">DR</span>
              <div>
                <strong>Denis · Mensagem de exemplo</strong>
                <p>
                  Preparei uma primeira direção visual. O que você acha da
                  organização e do estilo? Deixe suas observações aqui.
                </p>
              </div>
            </div>
            {comments.map((c, i) => (
              <div className="client-comment" key={i}>
                <strong>Você · demonstração</strong>
                <p>{c.text}</p>
                <small>{c.date}</small>
              </div>
            ))}
            <form onSubmit={comment}>
              <label className="field">
                Seu comentário
                <Textarea
                  required
                  maxLength={2000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Compartilhe suas observações..."
                />
              </label>
              <Button type="submit" disabled={!text.trim()}>
                Adicionar comentário local <ArrowUpRight />
              </Button>
            </form>
            {notice && (
              <p role="status" className="save-message">
                {notice}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
