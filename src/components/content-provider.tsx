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
          setContent(parsed);
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
