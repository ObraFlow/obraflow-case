import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Uma família só, inclusive em títulos (docs/design.md > Tipografia).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ObraFlow",
  description: "Pedidos de compra com aprovação por alçada.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
