import Link from "next/link";
import LoginForm from "@/components/login-form";
export const metadata = { title: "Entrar", robots: { index: false, follow: false } };
export default function Login() {
  return <main className="login-page"><section className="login-card">
    <Link href="/" aria-label="Voltar ao site"><img src="/simbolo.svg" width="48" height="48" alt="Denis Ramos" /></Link>
    <p className="eyebrow">DENIS RAMOS / ADMIN</p><h1>Acesse seu painel</h1>
    <p>Entre com sua conta administrativa.</p><LoginForm />
    <Link href="/">Voltar ao site</Link>
  </section></main>;
}
