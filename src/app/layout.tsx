import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";
import { ContentProvider } from "@/components/content-provider";
const onest = Onest({ subsets: ["latin"], display: "swap", variable: "--font-onest" });
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
    <html lang="pt-BR" className={onest.variable}>
      <body>
        <ContentProvider>{children}</ContentProvider>
      </body>
    </html>
  );
}
