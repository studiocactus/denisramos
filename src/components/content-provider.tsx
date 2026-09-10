"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { initialContent, type SiteContent } from "@/lib/content";
const Context = createContext({
  content: initialContent,
  save: (_: SiteContent) => {},
  reset: () => {},
});
export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(initialContent);
  useEffect(() => {
    try {
      const value = localStorage.getItem("denis-portfolio-demo-v1");
      if (value) {
        const parsed = JSON.parse(value);
        if (
          typeof parsed.headline === "string" &&
          typeof parsed.intro === "string" &&
          typeof parsed.about === "string" &&
          typeof parsed.email === "string" &&
          Array.isArray(parsed.projects) &&
          parsed.projects.every(
            (p: Record<string, unknown>) =>
              [
                "slug",
                "title",
                "category",
                "year",
                "color",
                "description",
                "challenge",
                "solution",
              ].every((k) => typeof p[k] === "string") &&
              typeof p.published === "boolean",
          )
        ) {
          if (!localStorage.getItem("denis-demo-six-projects")) {
            const extras = initialContent.projects.filter(p => ["nexo", "aurora", "vertice"].includes(p.slug) && !parsed.projects.some((saved: {slug:string}) => saved.slug === p.slug));
            parsed.projects.push(...extras);
            localStorage.setItem("denis-portfolio-demo-v1", JSON.stringify(parsed));
            localStorage.setItem("denis-demo-six-projects", "1");
          }
          setContent({...parsed,
            clientLogos: Array.isArray(parsed.clientLogos) ? parsed.clientLogos.filter((logo:Record<string,unknown>)=>typeof logo.name==='string'&&typeof logo.src==='string'&&/^data:image\/(png|jpeg);base64,/.test(logo.src)) : [],
            process: Array.isArray(parsed.process) && parsed.process.every((p: Record<string,unknown>)=>typeof p.title==='string'&&typeof p.description==='string') ? parsed.process : initialContent.process,
            personal: Array.isArray(parsed.personal) && parsed.personal.every((p: Record<string,unknown>)=>typeof p.label==='string'&&typeof p.value==='string') ? parsed.personal : initialContent.personal,
            location: typeof parsed.location==='string'?parsed.location:initialContent.location,
            socials: Array.isArray(parsed.socials) && parsed.socials.every((p: Record<string,unknown>)=>typeof p.label==='string'&&typeof p.url==='string') ? parsed.socials : initialContent.socials,
          });
        }
      }
    } catch {}
  }, []);
  function save(next: SiteContent) {
    localStorage.setItem("denis-portfolio-demo-v1", JSON.stringify(next));
    setContent(next);
  }
  function reset() {
    localStorage.removeItem("denis-portfolio-demo-v1");
    setContent(initialContent);
  }
  return (
    <Context.Provider value={{ content, save, reset }}>
      {children}
    </Context.Provider>
  );
}
export const useContent = () => useContext(Context);
