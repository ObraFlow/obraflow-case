import { ImageResponse } from "next/og";

// Card de compartilhamento (WhatsApp, LinkedIn, Slack): fundo escuro do header, símbolo e
// wordmark em branco, a frase do produto em cinza e a etiqueta "Dokimos" em amarelo. É a
// única peça em que o amarelo não é "sua vez": aqui ele é a marca do serviço de aprovações,
// e a imagem vive fora do app (docs/design.md > Marca).
export const alt = "ObraFlow: pedidos de compra com aprovação por alçada";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Baixa a Archivo expandida (wdth 125, peso 700) do Google Fonts em formato TTF, que é o que
 * o gerador de imagem lê. Sem rede (build offline), a imagem sai com a fonte padrão.
 */
async function carregarArchivo(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,700&display=swap",
      // Sem cabeçalho de browser moderno, o Google devolve TTF em vez de woff2.
      { headers: { "User-Agent": "Mozilla/5.0" } },
    ).then((resposta) => resposta.text());
    const url = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((resposta) => resposta.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function Image() {
  const archivo = await carregarArchivo();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "#23211E",
        color: "#FFFFFF",
        fontFamily: archivo ? "Archivo" : "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <svg viewBox="0 0 20 20" width="72" height="72">
          <rect x="1" y="8" width="11" height="11" fill="#FFFFFF" />
          <rect x="8" y="1" width="11" height="11" fill="none" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: "-0.02em" }}>ObraFlow</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ fontSize: 44, lineHeight: 1.2, color: "#CFCAC1", maxWidth: 900 }}>
          Pedidos de compra com aprovação por alçada.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              padding: "8px 16px",
              background: "#F2B300",
              color: "#23211E",
              fontSize: 28,
              fontWeight: 700,
              borderRadius: 4,
            }}
          >
            Dokimos
          </div>
          <div style={{ fontSize: 28, color: "#CFCAC1" }}>serviço de aprovações</div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: archivo
        ? [{ name: "Archivo", data: archivo, style: "normal" as const, weight: 700 as const }]
        : undefined,
    },
  );
}
