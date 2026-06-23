import { ImageResponse } from "next/og";

export const alt = "nocuju.cz — útulny a nouzová nocoviště v ČR";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          padding: "80px",
          background:
            "linear-gradient(135deg, #0c2a22 0%, #134438 45%, #0a1a17 100%)",
          color: "#fafaf7",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Horská ikona — nocuju.cz */}
          <div
            style={{
              position: "relative",
              width: 56,
              height: 56,
              display: "flex",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#cfd6b5",
                clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "#3a6b48",
                clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                transform: "scale(0.82) translateY(-4px)",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            nocuju.cz
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 104,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
            }}
          >
            Útulny, sruby a nocoviště v Česku.
          </div>
          <div style={{ fontSize: 30, opacity: 0.78, maxWidth: 900 }}>
            Veřejně sdílená místa k přespání venku na jednom přehledném místě.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            opacity: 0.7,
          }}
        >
          <span>nocuju.cz</span>
          <span>Objevit · Mapa · O projektu</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
