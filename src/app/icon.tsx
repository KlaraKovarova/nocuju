import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#fafaf7",
        }}
      >
        {/* Hora – tmavě zelený trojúhelník */}
        <div
          style={{
            position: "absolute",
            inset: 4,
            background: "#3a6b48",
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          }}
        />
        {/* Přístřešek – střecha (světle šalvějová) */}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            left: "29%",
            right: "29%",
            height: "29%",
            background: "#cfd6b5",
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          }}
        />
        {/* Přístřešek – stěny (teplá slonová kost) */}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            left: "36%",
            right: "36%",
            height: "14%",
            background: "#e6d4ba",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
