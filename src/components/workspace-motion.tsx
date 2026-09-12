"use client";
import { useEffect, useRef, useState } from "react";

const metrics = [
  ["56+", "Projetos entregues"],
  ["15+", "Anos de experiência"],
  ["48+", "Clientes felizes"],
  ["98%", "Taxa de sucesso"],
] as const;

export function AlternatingMetrics() {
  const root = useRef<HTMLDivElement>(null);
  const [textCount, setTextCount] = useState(0);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false, count = 0, direction = 1;
    function pause() { clearTimeout(timer); }
    function schedule() {
      pause();
      if (media.matches || !visible || document.hidden) return;
      timer = setTimeout(() => {
        count += direction;
        setTextCount(count);
        if (count === metrics.length || count === 0) direction *= -1;
        schedule();
      }, count === 0 || count === metrics.length ? 3600 : 2200);
    }
    function preference() { count = 0; direction = 1; setTextCount(0); schedule(); }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: 0.25 });
    if (root.current) observer.observe(root.current);
    media.addEventListener("change", preference);
    document.addEventListener("visibilitychange", schedule);
    return () => { pause(); observer.disconnect(); media.removeEventListener("change", preference); document.removeEventListener("visibilitychange", schedule); };
  }, []);
  return <div className="metrics alternating-metrics" ref={root}>{metrics.map(([value, label], index) => (
    <div className={"metric-swap" + (index < textCount ? " is-text" : "")} key={value}>
      <span className="sr-only">{value} {label}</span>
      <strong className="metric-number" aria-hidden="true">{value}</strong>
      <span className="metric-label" aria-hidden="true">{label}</span>
    </div>
  ))}</div>;
}

export function StageMeter({ value, animate }: { value: number; animate: boolean }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    function start() {
      cancelAnimationFrame(frame);
      if (!animate || media.matches) { setShown(value); return; }
      const started = performance.now();
      function tick(now: number) {
        const t = (now - started) / 1000;
        const progress = 1 - Math.exp(-6 * t) * (Math.cos(9 * t) + 6 / 9 * Math.sin(9 * t));
        setShown(t >= 1.5 ? value : Math.max(0, Math.min(100, value * progress)));
        if (t < 1.5) frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }
    start(); media.addEventListener("change", start);
    return () => { cancelAnimationFrame(frame); media.removeEventListener("change", start); };
  }, [value, animate]);
  return <><div className="workspace-progress-heading"><strong>Andamento por etapas</strong><span className="meter-readout">{Math.round(shown)}%</span></div><div className="progress-track stage-meter" role="progressbar" aria-label="Etapas concluídas" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${shown}%` }} /></div></>;
}
