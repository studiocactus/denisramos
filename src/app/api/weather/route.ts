export async function GET() {
  try {
    const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-23.96&longitude=-46.33&current=weather_code,is_day&timezone=America%2FSao_Paulo", {
      next: { revalidate: 600 }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Weather unavailable");
    const { current } = await response.json();
    if (!Number.isInteger(current?.weather_code) || ![0, 1].includes(current?.is_day)) throw new Error("Invalid weather");
    return Response.json({ code: current.weather_code, day: current.is_day === 1 });
  } catch {
    return Response.json({ error: "Tempo indisponível" }, { status: 503 });
  }
}
