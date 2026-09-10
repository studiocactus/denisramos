"use client";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react";
import { useContent } from "./content-provider";
import { Artwork, Brand, Footer, ProjectCard } from "./portfolio";
export default function ProjectDetail({ slug }: { slug: string }) {
  const { content } = useContent();
  const project = content.projects.find((p) => p.slug === slug && p.published);
  if (!project)
    return (
      <main className="container empty-state">
        <h1>Projeto não encontrado.</h1>
        <Link href="/">Voltar para a home</Link>
      </main>
    );
  return (
    <div id="top">
      <header className="container page-header">
        <Brand />
        <Link href="/#portfolio" className="back-link">
          <ArrowLeft /> Voltar para a home
        </Link>
      </header>
      <main>
        <section className="container project-intro">
          <p className="eyebrow">ESTUDO CONCEITUAL / {project.year}</p>
          <h1>
            {project.title}
            <span className="lime-text">.</span>
          </h1>
          <div>
            <p>{project.description}</p>
            <span>{project.category}</span>
          </div>
        </section>
        <div className="container project-cover">
          <Artwork project={project} />
        </div>
        <section className="container case-body">
          <p className="eyebrow">DO CONCEITO À EXPERIÊNCIA</p>
          <div>
            <article>
              <span>01 / O DESAFIO</span>
              <h2>Uma intenção clara.</h2>
              <p>{project.challenge}</p>
            </article>
            <article>
              <span>02 / A SOLUÇÃO</span>
              <h2>Design que faz sentido.</h2>
              <p>{project.solution}</p>
            </article>
            <article>
              <span>03 / PROCESSO</span>
              <h2>Construído em colaboração.</h2>
              <p>
                Descoberta e referências, definição da direção visual,
                prototipação e desenvolvimento responsivo. Este é um case
                demonstrativo; os entregáveis e resultados do projeto real serão
                incluídos pelo painel.
              </p>
            </article>
          </div>
        </section>
        <section className="container related">
          <div className="section-heading">
            <h2>Continue explorando.</h2>
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
