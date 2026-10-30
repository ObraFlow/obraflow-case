import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Uma família só, inclusive em títulos (docs/design.md > Tipografia). Fonte variável com o
// eixo de largura: a marca usa 125% e os títulos de página 112% (`font-stretch`); o resto 100%.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "ObraFlow",
  description: "Pedidos de compra com aprovação por alçada.",
  openGraph: {
    title: "ObraFlow",
    description: "Pedidos de compra com aprovação por alçada.",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
