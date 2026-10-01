import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { blend, contrastRatio, parseHslToken, type Rgba } from "@/lib/color";

/*
 * Reads the real tokens from app/globals.css, so a token edit that breaks
 * WCAG AA fails here. Light = :root (dark) with the html.light overrides.
 */
const css = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block`);
  const body = css.slice(start, css.indexOf("}", start));
  const tokens: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  return tokens;
}

const dark = block(":root");
const THEMES = { dark, light: { ...dark, ...block("html.light") } };

const AA = 4.5;

describe.each(Object.entries(THEMES))("%s theme", (_, tokens) => {
  const color = (name: string, alpha = 1): Rgba => {
    const c = parseHslToken(tokens[name] ?? "", alpha);
    if (!c) throw new Error(`--${name} is not an HSL token: ${tokens[name]}`);
    return c;
  };
  const surfaces = ["background", "surface", "elevated"];

  it.each(surfaces)("muted text on %s >= 4.5:1", (bg) => {
    expect(contrastRatio(color("muted-foreground"), color(bg))).toBeGreaterThanOrEqual(AA);
  });

  it.each(surfaces)("body text on %s >= 7:1", (bg) => {
    expect(contrastRatio(color("foreground"), color(bg))).toBeGreaterThanOrEqual(7);
  });

  it.each(surfaces.flatMap((bg) => [["positive", bg], ["negative", bg]]))(
    "%s text on %s >= 4.5:1",
    (fg, bg) => {
      expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(AA);
    },
  );

  it.each(["background", "surface"].flatMap((bg) => [["positive", bg], ["negative", bg]]))(
    "%s badge (text on its tint) over %s >= 4.5:1",
    (fg, bg) => {
      const tint = blend(color(`${fg}-bg`), color(bg));
      expect(contrastRatio(color(fg), tint)).toBeGreaterThanOrEqual(AA);
    },
  );

  it("primary button label >= 4.5:1", () => {
    expect(contrastRatio(color("primary-foreground"), color("primary"))).toBeGreaterThanOrEqual(AA);
  });

  it.each(["background", "surface"])("teal text and Featured badge on %s >= 4.5:1", (bg) => {
    expect(contrastRatio(color("primary"), color(bg))).toBeGreaterThanOrEqual(AA);
    const badge = blend(color("primary", 0.1), color(bg));
    expect(contrastRatio(color("primary"), badge)).toBeGreaterThanOrEqual(AA);
  });
});

describe("color helpers", () => {
  it("computes known contrast ratios", () => {
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const black = { r: 0, g: 0, b: 0, a: 1 };
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, white)).toBe(1);
  });

  it("blends a translucent color over an opaque one", () => {
    expect(blend({ r: 255, g: 0, b: 0, a: 0.5 }, { r: 0, g: 0, b: 255, a: 1 })).toEqual({
      r: 128,
      g: 0,
      b: 128,
      a: 1,
    });
  });
});
