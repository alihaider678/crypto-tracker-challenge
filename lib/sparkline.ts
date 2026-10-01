/**
 * SVG polyline points for a sparkline, scaled to fill width x height with
 * `pad` px of vertical padding. A flat series sits in the middle.
 */
export function sparklinePoints(
  values: number[],
  width: number,
  height: number,
  pad = 2,
): string {
  const finite = values.filter(Number.isFinite);
  if (finite.length < 2) return "";

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min;
  const step = width / (finite.length - 1);
  const usable = height - pad * 2;

  return finite
    .map((v, i) => {
      const y = range === 0 ? height / 2 : pad + (1 - (v - min) / range) * usable;
      return `${round(i * step)},${round(y)}`;
    })
    .join(" ");
}

/** Overall direction of a series: last vs first value. */
export function seriesTrend(values: number[]): "up" | "down" | "flat" {
  const finite = values.filter(Number.isFinite);
  if (finite.length < 2) return "flat";
  const first = finite[0];
  const last = finite[finite.length - 1];
  return last > first ? "up" : last < first ? "down" : "flat";
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
