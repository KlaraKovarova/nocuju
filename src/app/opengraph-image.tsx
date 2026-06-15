import { ImageResponse } from "next/og";

export const alt = "NOC — kde přespat venku v Česku";
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              background: "#fafaf7",
              color: "#141414",
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              borderRadius: 16,
            }}
          >
            NOC
          </div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              opacity: 0.75,
            }}
          >
            kde přespat venku
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
