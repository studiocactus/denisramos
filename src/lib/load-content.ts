/** Retry transient public failures without retrying authorization or invalid content. */
export async function loadContent(admin: boolean, signal: AbortSignal): Promise<Response> {
  const attempts = admin ? 1 : 3;
  for (let attempt = 0; attempt < attempts; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await fetch(admin ? "/api/content?admin=1" : "/api/content", {
        cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
      });
      if (response.status < 500 || attempt === attempts - 1) return response;
    } catch (error) {
      if (signal.aborted || attempt === attempts - 1) throw error;
    }
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(signal.reason); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 400 * (attempt + 1));
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
  throw new Error("Não foi possível carregar o conteúdo.");
}
