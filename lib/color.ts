/*
 * Color helpers for design tokens stored as HSL channels
 * ("172 66% 50%" or "152 69% 45% / 0.12"). Used by the chart (canvas can't
 * read CSS variables) and by the contrast tests.
 */

export type Rgba = { r: number; g: number; b: number; a: number };

const TOKEN = /^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+))?$/;

/** Token -> 0..255 RGB plus alpha; null if it isn't an HSL token. */
export function parseHslToken(token: string, alpha = 1): Rgba | null {
  const match = token.trim().match(TOKEN);
  if (!match) return null;

  const h = (((Number(match[1]) % 360) + 360) % 360) / 60;
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;
  const a = (match[4] === undefined ? 1 : Number(match[4])) * alpha;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 1 ? [c, x, 0]
    : h < 2 ? [x, c, 0]
    : h < 3 ? [0, c, x]
    : h < 4 ? [0, x, c]
    : h < 5 ? [x, 0, c]
    : [c, 0, x];

  const to255 = (v: number) => Math.round((v + m) * 255);
  return { r: to255(r), g: to255(g), b: to255(b), a };
}

/** Token -> "rgba(r, g, b, a)"; `alpha` multiplies the token's own alpha. */
export function hslTokenToRgba(token: string, alpha = 1): string | null {
  const c = parseHslToken(token, alpha);
  if (!c) return null;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.round(c.a * 1000) / 1000})`;
}

/** A translucent color painted over an opaque one. */
export function blend(top: Rgba, bottom: Rgba): Rgba {
  const mix = (t: number, b: number) => Math.round(t * top.a + b * (1 - top.a));
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

function luminance({ r, g, b }: Rgba): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2 contrast ratio, 1..21. Both colors are treated as opaque. */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
