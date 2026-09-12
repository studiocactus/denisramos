export default function PageLoading({ label = "Carregando…" }: { label?: string }) {
  return <div className="page-loading" role="status" aria-live="polite"><span className="page-loading-symbol" aria-hidden="true" /><span>{label}</span><span className="page-loading-track" aria-hidden="true"><span /></span></div>;
}
