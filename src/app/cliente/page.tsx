import Dashboard from "@/components/dashboard";
export const metadata = {
  title: "Área do cliente — Demonstração",
  robots: { index: false, follow: false },
};
export default function Client() {
  return <Dashboard client />;
}
