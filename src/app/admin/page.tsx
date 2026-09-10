import Dashboard from "@/components/dashboard";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: admin, error: accessError } = await supabase.rpc("is_portfolio_admin");
  if (accessError || admin !== true) redirect("/login");
  return <Dashboard />;
}
