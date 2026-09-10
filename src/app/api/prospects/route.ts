import { createHash, timingSafeEqual } from "node:crypto";
import { countries, parseProspectQuery, selectProspects, type GooglePlace } from "@/lib/prospecting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const configured = () => !!process.env.GOOGLE_PLACES_API_KEY && (process.env.PROSPECTING_ACCESS_TOKEN?.length ?? 0) >= 32 && (process.env.PROSPECTING_ACCESS_TOKEN?.length ?? 0) <= 512;
// Per-instance burst protection. Set a daily quota in Google Cloud for an account-wide cap.
let windowStart = 0;
let requests = 0;

export async function GET() {
  return response({ configured: configured() });
}

export async function POST(request: Request) {
  if (!configured()) return response({ error: "A busca ainda precisa ser conectada ao Google Places. Configure a chave da API e a senha de acesso no servidor." }, 503);
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (token.length > 512 || !timingSafeEqual(createHash("sha256").update(token).digest(), createHash("sha256").update(process.env.PROSPECTING_ACCESS_TOKEN!).digest())) {
    return response({ error: "Senha de acesso inválida. Confira a conexão da prospecção." }, 401);
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return response({ error: "Origem da consulta não permitida." }, 403);
  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 6000) return response({ error: "Consulta muito longa." }, 400);
    input = JSON.parse(raw);
  } catch { return response({ error: "Consulta inválida." }, 400); }
  const query = parseProspectQuery(input);
  if (!query) return response({ error: "Confira segmento, localização e filtros antes de buscar." }, 400);
  if (Date.now() - windowStart > 60_000) { windowStart = Date.now(); requests = 0; }
  if (++requests > 10) return response({ error: "Muitas consultas em sequência. Aguarde um minuto e tente novamente." }, 429);
  try {
    const upstream = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(20_000),
      headers: {
        "Content-Type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri,places.attributions,nextPageToken",
      },
      body: JSON.stringify({ textQuery: `${query.segment} em ${query.location}, ${countries[query.country]}`,
        languageCode: "pt-BR", regionCode: query.country, pageSize: 20,
        ...(query.pageToken ? { pageToken: query.pageToken } : {}),
      }),
    });
    if (!upstream.ok) {
      const error = upstream.status === 429 ? "A cota do Google Places foi atingida. Confira os limites no Google Cloud."
        : [401, 403].includes(upstream.status) ? "O Google não autorizou a consulta. Verifique a chave, a ativação da Places API (New) e o faturamento."
        : upstream.status === 400 ? "O Google recusou a consulta. Inicie uma nova busca; a página anterior pode ter expirado."
        : "O Google Places está indisponível no momento. Tente novamente.";
      return response({ error }, upstream.status === 429 ? 429 : 502);
    }
    const data = await upstream.json() as { places?: GooglePlace[]; nextPageToken?: string };
    const places = Array.isArray(data.places) ? data.places : [];
    return response({ prospects: selectProspects(places, query), scanned: places.length,
      nextPageToken: data.nextPageToken || null, searchedAt: new Date().toISOString() });
  } catch {
    return response({ error: "A consulta demorou além do esperado ou a conexão falhou. Tente novamente." }, 504);
  }
}
