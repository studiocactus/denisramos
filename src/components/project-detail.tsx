"use client";
import Link from "./navigation-link";
import { TitleText } from "./title-text";
import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowUpRight, Target, Lightbulb, PencilRuler } from "@phosphor-icons/react";
import { useContent } from "./content-provider";
import { Artwork, Brand, Footer, ProjectCard, ProjectTags } from "./portfolio";
export default function ProjectDetail({ slug }: { slug: string }) {
  const { content, loading, error } = useContent();
  const stagesRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = stagesRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      section.classList.add("stages-entered");
      observer.disconnect();
    }, { threshold: 0.1 });
    observer.observe(section);
    return () => { observer.disconnect(); section.classList.remove("stages-entered"); };
  }, [loading, error, slug, content]);
  if (loading && !error) return <main className="container empty-state"><p role="status">Carregando projeto…</p></main>;
  if (error) return <main className="container empty-state"><p role="alert">Não foi possível carregar o projeto. Tente novamente.</p><Link href="/">Voltar para a home</Link></main>;
  const project = content.projects.find((p) => p.slug === slug && p.published);
  if (!project)
    return (
      <main className="container empty-state">
        <h1><TitleText text="Projeto não encontrado" highlight="não encontrado" /></h1>
        <Link href="/">Voltar para a home</Link>
      </main>
    );
  return (
    <div id="top" className="project-page">
      <header className="container page-header">
        <Brand />
        <Link href="/#portfolio" className="back-link">
          <ArrowLeft /> Voltar para a home
        </Link>
      </header>
      <main>
        <section className="container project-intro">
          <h1>
            <TitleText text={project.title} />
          </h1>
          <div className="project-overview">
            <div className="project-summary"><p>{project.description}</p><ProjectTags project={project} />
              {project.website && <a className="project-website" href={project.website} target="_blank" rel="noopener noreferrer">Visitar site <ArrowUpRight size={22} aria-hidden="true" /><span className="sr-only"> (abre em nova aba)</span></a>}
            </div>
            <dl className="project-facts">
              <div><dt>País</dt><dd>{project.country || "Não informado"}</dd></div>
              <div><dt>Duração</dt><dd>{project.duration || "Não informada"}</dd></div>
              <div><dt>Ano</dt><dd>{project.year}</dd></div>
            </dl>
          </div>
        </section>
        <div className="container project-cover">
          <Artwork project={{ ...project, cover: project.detailCover ?? project.cover }} />
        </div>
        <section className="container case-body">
          <p className="eyebrow">DO CONCEITO À EXPERIÊNCIA</p>
          <div>
            <article>
              <span><Target size={26} aria-hidden="true" /> O DESAFIO</span>
              <h2><TitleText text="Uma intenção clara" highlight="clara" /></h2>
              <p>{project.challenge}</p>
            </article>
            <article>
              <span><Lightbulb size={26} aria-hidden="true" /> A SOLUÇÃO</span>
              <h2><TitleText text="Design que faz sentido" highlight="sentido" /></h2>
              <p>{project.solution}</p>
            </article>
            <article>
              <span><PencilRuler size={26} aria-hidden="true" /> PROCESSO</span>
              <h2><TitleText text="Construído em colaboração" highlight="colaboração" /></h2>
              <p>
                Descoberta e referências, definição da direção visual,
                prototipação e desenvolvimento responsivo. Este é um case
                demonstrativo; os entregáveis e resultados do projeto real serão
                incluídos pelo painel.
              </p>
            </article>
          </div>
        </section>
        <section ref={stagesRef} className="project-stages container" aria-labelledby="project-stages-title">
          <div className="project-stages-heading"><h2 id="project-stages-title"><TitleText text="Etapas do projeto" highlight="projeto" /></h2><p>O PROCESSO É A CHAVE</p></div>
          <div className="project-stages-grid">
            {[
              ["Descoberta", "Definição do escopo, objetivos e entendimento do problema.", "Briefing / Pesquisas / Imersão"],
              ["Ideação", "Geração de ideias e soluções estratégicas para o projeto.", "Moodboard / Wireframe / Copy"],
              ["Prototipação", "Exploração detalhada nas cores, imagens, ilustrações e ícones.", "Visual / Protótipo navegável / Testes"],
              ["Entrega", "Organização, fechamento e apresentação do projeto.", "Documentação / Style guide / Handoff"],
            ].map(([title, description, details], index) => <article key={title}><h3><span>{String(index + 1).padStart(2, "0")}</span>{title}</h3><p>{description}</p><small>{details}</small></article>)}
          </div>
        </section>
        {!!project.images?.length && <section className="container project-gallery" aria-label={`Imagens do projeto ${project.title}`}>
          {project.images.map((image, index) => <img key={`${index}-${image.src.slice(-32)}`} src={image.src} alt={image.alt || `${project.title} — imagem ${index + 1}`} loading="lazy" decoding="async" />)}
        </section>}
        <section className="container related">
          <div className="section-heading">
            <h2><TitleText text="Continue explorando" highlight="explorando" /></h2>
            <Link href="/#portfolio">
              Todos os projetos <ArrowUpRight />
            </Link>
          </div>
          <div className="related-grid">
            {content.projects
              .filter((p) => p.slug !== slug && p.published)
              .slice(0, 2)
              .map((p) => (
                <ProjectCard project={p} key={p.slug} />
              ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
