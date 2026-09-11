import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientAccess from "@/components/client-access";
export const metadata = { title: "Nova senha — Área do cliente", robots: { index: false, follow: false } };
export default async function Password() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/cliente?access=expired");
  return <ClientAccess reset />;
}
