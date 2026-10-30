import { ImageResponse } from "next/og";

// Ícone de tela inicial no iOS: o símbolo da marca em escala, sem texto (só formas, então
// não precisa de fonte). Mesmo desenho de `icon.svg` e `components/layout/marca.tsx`.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#E9E7E2",
      }}
    >
      <svg viewBox="0 0 20 20" width="120" height="120">
        <rect x="1" y="8" width="11" height="11" fill="#23211E" />
        <rect x="8" y="1" width="11" height="11" fill="none" stroke="#23211E" strokeWidth="2" />
      </svg>
    </div>,
    size,
  );
}
