import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClientAccess from "@/components/client-access";
import ClientProjectsWorkspace from "@/components/client-projects-workspace";
import { Brand } from "@/components/portfolio";
import { clientLogout } from "./session";
export const metadata = {
  title: "Área do cliente — Denis Ramos",
  robots: { index: false, follow: false },
};
export default async function Client({ searchParams }: { searchParams: Promise<{ access?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;
  if (!user) return <>{params.access === "expired" && <p className="workspace-notice" role="alert">Este link expirou ou já foi usado. Entre com sua senha ou solicite um novo acesso.</p>}<ClientAccess /></>;
  return <div className="client-portal"><header className="container client-portal-header"><Brand /><div><span>{user.email}</span><Link href="/">Voltar ao site</Link><form action={clientLogout}><button type="submit">Sair</button></form></div></header><main className="container"><ClientProjectsWorkspace /></main></div>;
}
