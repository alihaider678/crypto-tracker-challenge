import { ImageResponse } from "next/og";

// Default share image for every page (coin pages inherit it).
export const alt = "CryptoPulse: live crypto market data";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Hex copies of the dark tokens: the image renderer can't read CSS variables.
const BG = "#0C0E13"; // --background
const SURFACE = "#11151D"; // --surface
const BORDER = "#262C3A"; // --border
const TEXT = "#F1F4F9"; // --foreground
const MUTED = "#8E96A8"; // --muted-foreground
const TEAL = "#2BD4BD"; // --primary

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: BG,
          color: TEXT,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              border: `2px solid ${TEAL}66`,
              background: SURFACE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="56" height="56" viewBox="0 0 32 32">
              <path
                d="M5 16h5l3-7 6 14 3-7h5"
                fill="none"
                stroke={TEAL}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>CryptoPulse</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            Crypto prices you can read at a glance.
          </div>
          <div style={{ fontSize: 32, color: MUTED }}>
            Live prices, 24h movers and candlestick charts for every Binance spot pair.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 26,
            color: MUTED,
            borderTop: `2px solid ${BORDER}`,
            paddingTop: 28,
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: 7, background: TEAL }} />
          Live market data from Binance
        </div>
      </div>
    ),
    size,
  );
}
