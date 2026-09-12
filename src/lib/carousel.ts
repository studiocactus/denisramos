// Several cards can share the final viewport. Each stop must move the track.
export function carouselStops(offsets: number[], maxScroll: number): number[] {
  const stops: number[] = [];
  for (const offset of offsets) {
    const position = Math.max(0, Math.min(Math.max(0, maxScroll), offset));
    if (!stops.length || position - stops[stops.length - 1] > 2) stops.push(position);
  }
  return stops;
}

export function nearestCarouselStop(stops: number[], position: number): number {
  return stops.reduce((best, stop, index) =>
    Math.abs(stop - position) < Math.abs(stops[best] - position) ? index : best, 0);
}
