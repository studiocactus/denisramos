import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container empty-state">
      <p className="eyebrow">404 / PÁGINA NÃO ENCONTRADA</p>
      <h1>Vamos voltar ao início?</h1>
      <Link href="/">Voltar para a home →</Link>
    </main>
  );
}
