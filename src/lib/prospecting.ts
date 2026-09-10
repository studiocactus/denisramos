export type Prospect = {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: number | null;
  reviews: number;
  mapsUrl: string;
  attributions: { name: string; uri: string }[];
};

export type ProspectQuery = {
  segment: string;
  location: string;
  country: string;
  minRating: number;
  phoneOnly: boolean;
};

export const countries: Record<string, string> = {
  BR: "Brasil", PT: "Portugal", US: "Estados Unidos", CA: "Canadá",
  AR: "Argentina", MX: "México", ES: "Espanha", GB: "Reino Unido",
};

export type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  googleMapsUri?: string;
  attributions?: { provider?: string; providerUri?: string }[];
};

export function safeWebUrl(value: string | undefined): string {
  try {
    const url = new URL(value ?? "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

export function selectProspects(places: GooglePlace[], query: ProspectQuery): Prospect[] {
  const seen = new Set<string>();
  return places.flatMap(place => {
    const phone = place.internationalPhoneNumber || place.nationalPhoneNumber || "";
    if (!place.id || !place.displayName?.text || seen.has(place.id) || place.websiteUri?.trim()
      || place.businessStatus !== "OPERATIONAL"
      || (query.minRating > 0 && (place.rating ?? 0) < query.minRating)
      || (query.phoneOnly && !phone)) return [];
    seen.add(place.id);
    return [{
      id: place.id, name: place.displayName.text,
      address: place.formattedAddress || "Endereço não informado", phone,
      rating: place.rating ?? null, reviews: place.userRatingCount ?? 0,
      mapsUrl: safeWebUrl(place.googleMapsUri) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName.text)}&query_place_id=${encodeURIComponent(place.id)}`,
      attributions: (place.attributions ?? []).map(item => ({ name: item.provider ?? "", uri: safeWebUrl(item.providerUri) })).filter(item => item.name),
    }];
  });
}

export function parseProspectQuery(value: unknown): (ProspectQuery & { pageToken?: string }) | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.segment !== "string" || input.segment.trim().length < 2 || input.segment.length > 100
    || typeof input.location !== "string" || input.location.trim().length < 2 || input.location.length > 150
    || typeof input.country !== "string" || !Object.hasOwn(countries, input.country)
    || typeof input.minRating !== "number" || ![0, 3, 3.5, 4, 4.5].includes(input.minRating)
    || typeof input.phoneOnly !== "boolean"
    || (input.pageToken !== undefined && (typeof input.pageToken !== "string" || input.pageToken.length > 4000))) return null;
  return { segment: input.segment.trim(), location: input.location.trim(), country: input.country,
    minRating: input.minRating, phoneOnly: input.phoneOnly, pageToken: input.pageToken as string | undefined };
}
