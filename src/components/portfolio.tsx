"use client";
import { AlternatingMetrics } from "./workspace-motion";
import { TitleText } from "./title-text";
import { carouselStops, nearestCarouselStop } from "@/lib/carousel";
import Link from "./navigation-link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Minus,
  Asterisk,
  ArrowUp,
  Sun, Moon, CloudSun, CloudMoon, Cloud, CloudRain, CloudLightning, CloudFog, Snowflake, CloudSlash,
  Briefcase,
  Handshake,
  ChatsCircle,
  PencilRuler,
  Code,
  RocketLaunch,
  Lightbulb,
  User,
  CalendarBlank,
  Clock,
} from "@phosphor-icons/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useContent } from "./content-provider";
import { services, type Project } from "@/lib/content";
gsap.registerPlugin(useGSAP);
const processIcons = [ChatsCircle, PencilRuler, Code, RocketLaunch];
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Denis Ramos, início">
      <span className="brand-symbol" aria-hidden="true" />
      <span className="brand-wordmark" aria-hidden="true" />
    </Link>
  );
}
export function Artwork({ project }: { project: Project }) {
  if (project.cover) return <div className="artwork uploaded-artwork"><img src={project.cover.src} alt={project.cover.alt || project.title} decoding="async" /></div>;
  return (
    <div className={`artwork ${project.color}`} aria-hidden="true">
      {["blue","rose","ink"].includes(project.color) ? <div className="concept-art"><span>{project.title}</span><div className="concept-orbit"/></div> : project.color === "lime" ? (
        <div className="orbit-art">
          <div className="orbit-ring" />
          <span>
            {project.title}
          </span>

        </div>
      ) : project.color === "clay" ? (
        <div className="essencia-art">
          <span>{project.title}</span>
          <div className="bottle">
            <i />
            <b>e.</b>

          </div>
          <div className="bottle second">
            <i />
            <b>e.</b>
          </div>
        </div>
      ) : (
        <div className="forma-art">
          <span>
            {project.title}
          </span>

          <div className="arch" />
          <div className="arch arch-two" />
        </div>
      )}
    </div>
  );
}
export function ProjectTags({ project }: { project: Project }) {
  const tags = (project.tags ?? []).map(tag => tag.trim()).filter(Boolean);
  if (!tags.length) return null;
  return <ul className="project-tags" aria-label="Tags do projeto">{tags.map((tag, index) => <li key={index}>{tag}</li>)}</ul>;
}
export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projetos/${project.slug}`} className="project-card">
      <div className="project-card-image">
        <Artwork project={project} />
        <ProjectTags project={project} />
      </div>
      <span className="project-tooltip" aria-hidden="true">Ver projeto <ArrowUpRight size={18} /></span>
      <div className="project-caption">
        <div>
          <h3>{project.title}</h3>
          <p>{project.category}</p>
        </div>
        <span className="project-nav project-nav-next project-card-link" aria-hidden="true">
          <ArrowUpRight size={28} />
        </span>
      </div>
    </Link>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="container footer-bottom">
        <div className="footer-info"><p>© {new Date().getFullYear()} Denis Ramos</p><SaoPauloTime /></div>
        <div>
          <Link href="/cliente">
            Área do cliente <ArrowUpRight />
          </Link>
          <a href="#top" className="back-to-top">
            Voltar ao topo <ArrowUp size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
}
function SaoPauloTime() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [weather, setWeather] = useState<{ code: number; day: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const update = async () => {
      try {
        const response = await fetch("/api/weather", { signal: controller.signal });
        if (!response.ok) throw new Error("Weather unavailable");
        setWeather(await response.json());
      } catch { if (!controller.signal.aborted) setWeather(null); }
    };
    void update();
    const timer = setInterval(update, 600000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);
  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
    const update = () => { const now = new Date(); setTime(formatter.format(now)); setDate(dateFormatter.format(now)); };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  const code = weather?.code;
  const [Icon, label] = code === undefined ? [CloudSlash, "Tempo indisponível"] as const
    : code === 0 ? [weather?.day ? Sun : Moon, "Céu limpo"] as const
    : code <= 2 ? [weather?.day ? CloudSun : CloudMoon, "Parcialmente nublado"] as const
    : code === 3 ? [Cloud, "Nublado"] as const
    : code <= 48 ? [CloudFog, "Nevoeiro"] as const
    : code >= 95 ? [CloudLightning, "Trovoadas"] as const
    : (code >= 71 && code <= 77) || code === 85 || code === 86 ? [Snowflake, "Neve"] as const
    : [CloudRain, "Chuva"] as const;
  return <div className="local-time">
    <span className="footer-status-item"><CalendarBlank size={18} aria-hidden="true" /><span><small>Hoje</small><span>{date || "--/--/----"}</span></span></span>
    <a className="local-weather footer-status-item" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" aria-label={`${label} em Santos. Dados Open-Meteo`} title={`${label} · Santos · Open-Meteo`}><Icon size={20} weight="duotone" aria-hidden="true" /><span><small>Santos / SP</small><span>{label}</span></span></a>
    <span className="footer-status-item"><Clock size={18} aria-hidden="true" /><span><small>Hora local</small><time>{time || "--:--:--"}</time></span></span>
  </div>;
}
function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let footerVisible = false;
    const update = () => setVisible(window.scrollY > 400 && !footerVisible);
    const observer = new IntersectionObserver(([entry]) => {
      footerVisible = entry.isIntersecting;
      update();
    });
    const footer = document.querySelector("footer");
    if (footer) observer.observe(footer);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); window.removeEventListener("scroll", update); };
  }, []);
  return <a href="#top" className={`floating-top${visible ? " is-visible" : ""}`} aria-label="Voltar ao topo" tabIndex={visible ? 0 : -1} aria-hidden={!visible}><ArrowUp size={24} aria-hidden="true" /></a>;
}
export default function Portfolio() {
  const { content } = useContent();
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const pendingSlide = useRef<number | null>(null);
  const [stops, setStops] = useState<number[]>([]);
  const [active, setActive] = useState<number | null>(0);
  const [slide, setSlide] = useState(0);
  const [contact, setContact] = useState(false);
  const projects = content.projects.filter((p) => p.published);
  const projectOrder = projects.map(project => project.slug).join("|");
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    function measure() {
      if (!element) return;
      const padding = parseFloat(getComputedStyle(element).paddingLeft) || 0;
      const left = element.getBoundingClientRect().left + padding;
      const offsets = Array.from(element.querySelectorAll<HTMLElement>(".project-card"))
        .map(card => element.scrollLeft + card.getBoundingClientRect().left - left);
      const nextStops = carouselStops(offsets, element.scrollWidth - element.clientWidth);
      setStops(nextStops);
      setSlide(nearestCarouselStop(nextStops, element.scrollLeft));
      pendingSlide.current = null;
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const card of element.children) observer.observe(card);
    return () => observer.disconnect();
  }, [projectOrder]);
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
    const element = track.current;
    if (!element || !stops.length) return;
    const current = pendingSlide.current ?? nearestCarouselStop(stops, element.scrollLeft);
    goTo(Math.max(0, Math.min(stops.length - 1, current + direction)));
  }
  function goTo(next: number) {
    const element = track.current;
    if (!element || stops[next] === undefined) return;
    pendingSlide.current = next;
    setSlide(next);
    element.scrollTo({
      left: stops[next],
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
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
            <a href="#contato" className="nav-cta motion-button">
              Vamos começar? <ArrowUpRight size={16} />
            </a>
          </nav>
        </header>
        <div className="container hero-content">
          <h1 className="hero-reveal">
            <TitleText text={content.headline === "Websites memoráveis. Que combinam com valor." ? "Websites\nMemoráveis.\nQue combinam\ncom Valor" : content.headline} highlight="Memoráveis" />
          </h1>
          <div className="hero-bottom hero-reveal">
            <div>
              <p>{content.intro === "Projetando o amanhã através de design, tecnologia e experiências digitais inovadoras." ? <>Projetando o amanhã através de <b>design, tecnologia</b> e <b>criação</b> de experiências digitais inovadoras.</> : content.intro}</p>
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
              <p className="eyebrow"><PencilRuler size={18} aria-hidden="true" /> Meus Serviços</p>
              <h2>
                <TitleText text={"O que posso\nfazer por você"} highlight="por você" />
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
            {services.map(([title, description, tags], i) => (
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
                  <span className="service-cross official-symbol" aria-hidden="true" />
                  <span>{title}</span>
                  {active === i ? <Minus size={23} /> : <Plus size={23} />}
                </button>
                <div id={`service-${i}`} className="service-panel" inert={active !== i} aria-hidden={active !== i}>
                  <div><div className="service-details"><p>{description}</p><ul className="service-tags" aria-label={`Especialidades de ${title}`}>{tags.map(tag => <li key={tag}>#{tag}</li>)}</ul></div></div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="growth container section-space reveal">
          <p className="eyebrow"><Lightbulb size={18} aria-hidden="true" /> BOAS IDEIAS MERECEM SAIR DO PAPEL</p>
          <h2>
            <TitleText text={"O crescimento vem\nde lançar produtos\nmais rápido do que\na concorrência"} highlight="mais rápido" />
          </h2>
          <p className="growth-description">
            Atuo junto à sua equipe como um multiplicador de força. Defino a
            direção para que todos trabalhem em prol do mesmo objetivo:
            transformar seus sistemas de design em uma vantagem de velocidade e
            valor.
          </p>
          <AlternatingMetrics />
        </section>
        <section id="portfolio" className="portfolio-section section-space">
          <div className="container section-heading reveal">
            <div>
              <p className="eyebrow"><Briefcase size={18} aria-hidden="true" /> PORTFÓLIO</p>
              <h2>
                <TitleText text={"Algumas ideias.\nGrandes possibilidades"} highlight="possibilidades" />
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
          <div
            className="project-track"
            ref={track}
            onWheel={() => { pendingSlide.current = null; }}
            onPointerDown={() => { pendingSlide.current = null; }}
            onScroll={() => {
              const element = track.current;
              if (!element) return;
              const pending = pendingSlide.current;
              if (pending !== null && Math.abs(element.scrollLeft - stops[pending]) <= 2) pendingSlide.current = null;
              if (pendingSlide.current === null) setSlide(nearestCarouselStop(stops, element.scrollLeft));
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
                className="project-nav project-nav-previous"
                disabled={slide === 0}
                aria-label="Projeto anterior"
                onClick={() => move(-1)}
              >
                <svg viewBox="0 0 24 32" aria-hidden="true"><path d="M12 0h12v10H12zM0 10h12v12H0zM12 22h12v10H12z" /></svg>
              </button>
              <button
                className="project-nav project-nav-next"
                disabled={stops.length <= 1 || slide >= stops.length - 1}
                aria-label="Próximo projeto"
                onClick={() => move(1)}
              >
                <svg viewBox="0 0 24 32" aria-hidden="true"><path d="M0 0h12v10H0zM12 10h12v12H12zM0 22h12v10H0z" /></svg>
              </button>
            </div>
            <div className="project-pagination" role="group" aria-label="Navegação dos trabalhos">
              {stops.map((position, index) => (
                <button
                  key={position}
                  className={slide === index ? "is-active" : ""}
                  aria-label={`Ir para a página ${index + 1} de ${stops.length}`}
                  aria-current={slide === index ? "true" : undefined}
                  onClick={() => goTo(index)}
                ><span aria-hidden="true" /></button>
              ))}
            </div>
          </div>
        </section>
        <section className="companies container reveal">
          <p className="eyebrow"><Handshake size={18} aria-hidden="true" /> CONEXÕES QUE CONSTROEM</p>
          <h2>
            <TitleText text={"Muitos projetos.\nBoas companhias"} highlight="companhias" />
          </h2>
          <div className="company-strip">
            <div className="company-marquee">{[0,1].map(copy=><div className="company-group" key={copy} aria-hidden={copy===1}>{content.clientLogos.length ? content.clientLogos.map((logo,i)=><img key={i} src={logo.src} alt={copy===0?logo.name:""} className="client-logo"/>):<><span>◈ SUUAM</span><span className="rovex">ROVEX</span><span>RUNAKAY</span><span>◢ WebProcess</span><span className="alzan">ALZAN</span></>}</div>)}</div>
          </div>
        </section>
        <section id="sobre" className="about container section-space reveal">
          <div>
            <p className="eyebrow"><User size={18} aria-hidden="true" /> SOBRE MIM</p>
            <h2>
              <TitleText text="Código, Design & Visão" highlight="Visão" />
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
          <div className="studio-heading"><div><p className="eyebrow"><span className="status-dot"/> COMO EU TRABALHO</p><h2 id="studio-title"><TitleText text={"Método na criação.\nPersonalidade em tudo"} highlight="Personalidade" /></h2></div><span className="studio-emblem official-symbol" aria-hidden="true" /></div>
          <div className="studio-steps">{content.process.map((step,i)=>{const Icon = processIcons[i % processIcons.length]; return <article key={i}><Icon className="process-icon" size={28} aria-hidden="true" /><h3>{step.title}</h3><p>{step.description}</p></article>;})}</div>
          <div className="studio-personal"><p className="studio-caption">FORA DO BRIEFING / UM POUCO DE MIM</p><div className="studio-facts">{content.personal.map((item,i)=><article key={i} className={i===0?'music-fact':''}><small>{item.label}</small><p>{item.value}{i===0&&<span className="music-bars" aria-hidden="true"><i/><i/><i/><i/><i/></span>}</p></article>)}</div></div>
        </section>
        <div className="name-marquee" aria-hidden="true">
          <svg className="pixel-mark" viewBox="0 0 70 90" fill="currentColor"><path d="M20 0h12v12H20zM0 16h10v10H0zM32 12h18v18H32zM14 32h16v16H14zM50 30h20v20H50zM32 50h18v18H32zM0 54h10v10H0zM20 68h12v12H20z"/></svg> Denis Ramos
        </div>
        <section id="contato" className="contact">
          <div className="container reveal">
            <h2>
              <TitleText text={"Se você tem uma boa ideia,\neu posso fazer funcionar"} highlight="boa ideia" />
            </h2>
            <div className="contact-actions">
              {content.email ? (
                <a className="button accent motion-button" href={`mailto:${content.email}`}>
                  Solicitar Orçamento
                </a>
              ) : (
                <button
                  className="button accent motion-button"
                  onClick={() => setContact(!contact)}
                  aria-expanded={contact}
                >
                  Solicitar Orçamento
                </button>
              )}
              <a className="button about-button motion-button" href="#sobre">
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
      <ScrollToTop />
    </div>
  );
}
