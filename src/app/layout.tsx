import type { Metadata } from "next";
import "./globals.css";
import { ContentProvider } from "@/components/content-provider";
export const metadata: Metadata = {
  title: {
    default: "Denis Ramos — Design & Desenvolvimento",
    template: "%s | Denis Ramos",
  },
  description:
    "Design, tecnologia e experiências digitais. Conheça a forma de trabalhar de Denis Ramos e explore projetos selecionados.",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <ContentProvider>{children}</ContentProvider>
      </body>
    </html>
  );
}
