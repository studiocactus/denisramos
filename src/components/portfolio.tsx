"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Asterisk,
  ArrowUp,
  Circle,
  Check,
} from "@phosphor-icons/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useContent } from "./content-provider";
import { services, type Project } from "@/lib/content";
gsap.registerPlugin(useGSAP);
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Denis Ramos, início">
      <span className="brand-symbol">✣</span> DENIS RAMOS
      <span className="brand-period">®</span>
    </Link>
  );
}
export function Artwork({ project }: { project: Project }) {
  return (
    <div className={`artwork ${project.color}`} aria-hidden="true">
      {["blue","rose","ink"].includes(project.color) ? <div className="concept-art"><span>{project.title}<sup>®</sup></span><div className="concept-orbit"/><small>{project.category}</small></div> : project.color === "lime" ? (
        <div className="orbit-art">
          <div className="orbit-ring" />
          <span>
            orbit<span className="mini-star">✳</span>
          </span>
          <small>YOUR IDEAS. IN SYNC.</small>
        </div>
      ) : project.color === "clay" ? (
        <div className="essencia-art">
          <span>essência.</span>
          <div className="bottle">
            <i />
            <b>e.</b>
            <small>
              O ESSENCIAL
              <br />É SENTIR.
            </small>
          </div>
          <div className="bottle second">
            <i />
            <b>e.</b>
          </div>
        </div>
      ) : (
        <div className="forma-art">
          <span>
            forma<span>®</span>
          </span>
          <small>ARQUITETURA PARA SENTIR.</small>
          <div className="arch" />
          <div className="arch arch-two" />
        </div>
      )}
    </div>
  );
}
export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projetos/${project.slug}`} className="project-card">
      <Artwork project={project} />
      <div className="project-caption">
        <div>
          <h3>{project.title}</h3>
          <p>{project.category}</p>
        </div>
        <span className="circle-button">
          <ArrowUpRight size={20} />
        </span>
      </div>
    </Link>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} Denis Ramos</p>
        <div>
          <Link href="/cliente">
            Área do cliente <ArrowUpRight />
          </Link>
          <Link href="/admin">Admin</Link>
          <a href="#top">
            Voltar ao topo <ArrowUp size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
}
export default function Portfolio() {
  const { content } = useContent();
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(0);
  const [slide, setSlide] = useState(0);
  const [contact, setContact] = useState(false);
  const projects = content.projects.filter((p) => p.published);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        "(prefers-reduced-motion: no-preference)",
        () => {
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((e) => {
                if (e.isIntersecting) {
                  gsap.fromTo(
                    e.target,
                    { y: 28, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
                  );
                  observer.unobserve(e.target);
                }
              });
            },
            { threshold: 0.1 },
          );
          root.current
            ?.querySelectorAll(".reveal")
            .forEach((el) => observer.observe(el));
          return () => observer.disconnect();
        },
        root,
      );
      return () => mm.revert();
    },
    { scope: root },
  );
  function move(direction: number) {
    const next = Math.max(0, Math.min(projects.length - 1, slide + direction));
    setSlide(next);
    track.current?.children[next]?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
      inline: "start",
    });
  }
  return (
    <div ref={root} id="top">
      <section className="hero">
        <div className="hero-photo" />
        <div className="hero-shade" />
        <header className="container hero-header">
          <Brand />
          <nav>
            <a href="#portfolio">Trabalhos</a>
            <a href="#sobre">Sobre mim</a>
            <a href="#contato" className="nav-cta">
              Vamos conversar <ArrowUpRight size={16} />
            </a>
          </nav>
        </header>
        <div className="container hero-content">
          <p className="eyebrow hero-reveal">
            <span className="status-dot" /> DESIGNER & DESENVOLVEDOR
            INDEPENDENTE
          </p>
          <h1 className="hero-reveal">
            {content.headline ===
            "Websites memoráveis. Que combinam com valor." ? (
              <>
                <span>Websites</span>
                <br />
                <span>Memoráveis.</span>
                <br />
                Que combinam
                <br />
                com Valor.
              </>
            ) : (
              content.headline
            )}
          </h1>
          <div className="hero-bottom hero-reveal">
            <div>
              <p>{content.intro === "Projetando o amanhã através de design, tecnologia e experiências digitais inovadoras." ? <>Projetando o amanhã através de<br/><b>design, tecnologia</b> e <b>criação</b> de experiências digitais inovadoras.</> : content.intro}</p>
              <strong>Imagine. Crie. Lance<span>.</span></strong>
            </div>
            <a
              href="#work"
              className="hero-scroll"
              aria-label="Conheça meus serviços"
            >
              <ArrowRight size={24} />
            </a>
          </div>
        </div>
        <div className="hero-tag">ESTRATÉGIA + DESIGN + CÓDIGO</div>
      </section>
      <main>
        <section id="work" className="container services section-space">
          <div className="section-heading reveal">
            <div>
              <p className="eyebrow">Meus Serviços</p>
              <h2>
                O que posso
                <br />
                fazer por você?
              </h2>
            </div>
            <p className="side-note">
              Soluções digitais de ponta a ponta,
              <br />
              do conceito ao deploy final,
              <br />
              com alta performance.
            </p>
          </div>
          <div className="service-list">
            {services.map(([title, description], i) => (
              <div
                className={`service ${active === i ? "active" : ""}`}
                key={title}
              >
                <button
                  aria-expanded={active === i}
                  aria-controls={`service-${i}`}
                  onClick={() => setActive(active === i ? null : i)}
                >
                  <span className="service-number">0{i + 1}</span>
                  <span className="service-cross" aria-hidden="true">✣</span>
                  <span>{title}</span>
                  {active === i ? <Minus size={23} /> : <Plus size={23} />}
                </button>
                <div id={`service-${i}`} className="service-panel" inert={active !== i} aria-hidden={active !== i}>
                  <div><p>{description}</p></div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="growth container section-space reveal">
          <p className="eyebrow">BOAS IDEIAS MERECEM SAIR DO PAPEL</p>
          <h2>
            O crescimento vem
            <br />
            de lançar produtos
            <br />
            <span>mais rápido</span> do que
            <br />a concorrência<span className="lime-text">.</span>
          </h2>
          <p className="growth-description">
            Atuo junto à sua equipe como um multiplicador de força. Defino a
            direção para que todos trabalhem em prol do mesmo objetivo:
            transformar seus sistemas de design em uma vantagem de velocidade e
            valor.
          </p>
          <div className="metrics">
            {[
              ["56+", "Projetos entregues"],
              ["15+", "Anos de experiência"],
              ["48+", "Clientes felizes"],
              ["98%", "Taxa de sucesso"],
            ].map(([n, label]) => (
              <div key={n}>
                <strong>{n}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <small className="draft-note">
            Indicadores do esboço · sujeitos à confirmação.
          </small>
        </section>
        <section id="portfolio" className="portfolio-section section-space">
          <div className="container section-heading reveal">
            <div>
              <p className="eyebrow">02 / PORTFÓLIO</p>
              <h2>
                Algumas ideias.
                <br />
                Grandes possibilidades.
              </h2>
            </div>
            <p className="side-note">
              Design com intenção.
              <br />
              Código com precisão.
              <br />
              Conheça os projetos ↓
            </p>
          </div>
          <div className="container">
            <p className="draft-note">
              Estudos conceituais para apresentação do layout. Os cases reais
              serão adicionados em breve.
            </p>
          </div>
          <div
            className="project-track"
            ref={track}
            onScroll={() => {
              if (track.current) {
                const width =
                  (track.current.children[0] as HTMLElement)?.offsetWidth + 24;
                const maxScroll = track.current.scrollWidth - track.current.clientWidth;
                if (width) setSlide(maxScroll > 0 && track.current.scrollLeft >= maxScroll - 2
                  ? projects.length - 1
                  : Math.round(track.current.scrollLeft / width));
              }
            }}
          >
            {projects.length === 0 && <p>Nenhum projeto publicado por enquanto.</p>}
            {projects.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
          <div className="container slider-controls">
            <div>
              <button
                className="circle-button"
                disabled={slide === 0}
                aria-label="Projeto anterior"
                onClick={() => move(-1)}
              >
                <ArrowLeft />
              </button>
              <button
                className="circle-button accent"
                disabled={slide >= projects.length - 1}
                aria-label="Próximo projeto"
                onClick={() => move(1)}
              >
                <ArrowRight />
              </button>
            </div>
            <span className="slide-count">
              {String(slide + 1).padStart(2, "0")}{" "}
              <span>/ {String(projects.length).padStart(2, "0")}</span>
            </span>
          </div>
        </section>
        <section className="companies container reveal">
          <p className="eyebrow">03 / CONEXÕES QUE CONSTROEM</p>
          <h2>
            Muitos projetos.
            <br />
            Boas companhias.
          </h2>
          <div className="company-strip">
            <div className="company-marquee">{[0,1].map(copy=><div className="company-group" key={copy} aria-hidden={copy===1}>{content.clientLogos.length ? content.clientLogos.map((logo,i)=><img key={i} src={logo.src} alt={copy===0?logo.name:""} className="client-logo"/>):<><span>◈ SUUAM</span><span className="rovex">ROVEX</span><span>RUNAKAY</span><span>◢ WebProcess</span><span className="alzan">ALZAN</span></>}</div>)}</div>
          </div>
          {!content.clientLogos.length && <p className="draft-note">Marcas presentes no esboço fornecido.</p>}
        </section>
        <section id="sobre" className="about container section-space reveal">
          <div>
            <p className="eyebrow">Sobre Mim</p>
            <h2>
              Código, Design & Visão
            </h2>
            <p className="about-lead">{content.about}</p>
            <p>
              Com mais de 15 anos no mercado, já transformei dezenas de ideias em produtos
              digitais escaláveis. Ao longo da jornada, já criei mais de 200 projetos de sites e
              aplicativos, ajudando empresas a se destacarem no digital com interfaces simples,
              funcionais e alto impacto visual.
            </p>
            <div className="about-signature">
              Denis Ramos <ArrowUpRight size={24} />
            </div>
          </div>
          <div className="about-visual">
            <div className="visual-grid" />
            <Asterisk className="about-asterisk" weight="thin" />
            <span>
              Um olhar criativo.
              <br />
              Infinitas possibilidades.
            </span>
            <small>DESIGN MEETS DEVELOPMENT</small>
          </div>
        </section>
        <section className="studio-panel container reveal" aria-labelledby="studio-title">
          <div className="studio-heading"><div><p className="eyebrow"><span className="status-dot"/> COMO EU TRABALHO</p><h2 id="studio-title">Método na criação.<br/><span>Personalidade em tudo.</span></h2></div><span className="studio-emblem" aria-hidden="true">✣</span></div>
          <div className="studio-steps">{content.process.map((step,i)=><article key={i}><small>{String(i+1).padStart(2,'0')}</small><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
          <div className="studio-personal"><p className="studio-caption">FORA DO BRIEFING / UM POUCO DE MIM</p><div className="studio-facts">{content.personal.map((item,i)=><article key={i} className={i===0?'music-fact':''}><small>{item.label}</small><p>{item.value}{i===0&&<span className="music-bars" aria-hidden="true"><i/><i/><i/><i/><i/></span>}</p></article>)}</div></div>
        </section>
        <div className="name-marquee" aria-hidden="true">
          <svg className="pixel-mark" viewBox="0 0 70 90" fill="currentColor"><path d="M20 0h12v12H20zM0 16h10v10H0zM32 12h18v18H32zM14 32h16v16H14zM50 30h20v20H50zM32 50h18v18H32zM0 54h10v10H0zM20 68h12v12H20z"/></svg> Denis Ramos
        </div>
        <section id="contato" className="contact">
          <div className="container reveal">
            <h2>
              Se você tem uma boa ideia,
              <br />
              eu posso fazer funcionar!
            </h2>
            <div className="contact-actions">
              {content.email ? (
                <a className="button accent" href={`mailto:${content.email}`}>
                  <span className="button-mark" aria-hidden="true"><svg viewBox="0 0 20 26" fill="currentColor"><path d="M2 0h8v8H2zM10 8h8v10h-8zM2 18h8v8H2z"/></svg></span> Solicitar Orçamento
                </a>
              ) : (
                <button
                  className="button accent"
                  onClick={() => setContact(!contact)}
                  aria-expanded={contact}
                >
                  <span className="button-mark" aria-hidden="true"><svg viewBox="0 0 20 26" fill="currentColor"><path d="M2 0h8v8H2zM10 8h8v10h-8zM2 18h8v8H2z"/></svg></span> Solicitar Orçamento
                </button>
              )}
              <a className="button outline" href="#sobre">
                Mais sobre mim
              </a>
            </div>
            {contact && !content.email && (
              <p className="contact-notice" role="status">
                O canal de contato será disponibilizado em breve. Este portfólio
                está em construção.
              </p>
            )}
            <p className="contact-description">
              Um designer criativo brasileiro especializado na criação de identidades
              <br />
              de marca e experiências digitais que se destacam.
            </p>            <div className="contact-details"><div><small>Local onde moro agora</small><p>{content.location}</p></div><div><small>Sociais</small><div className="social-links">{content.socials.map((social,i)=>/^https?:\/\//i.test(social.url)?<a key={i} href={social.url} target="_blank" rel="noopener noreferrer">{social.label}<ArrowUpRight size={15}/></a>:<span key={i}>{social.label}</span>)}</div></div></div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
