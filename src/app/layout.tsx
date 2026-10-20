import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ObraFlow — base da aplicação",
  description: "Pedidos de compra e aprovações por alçada para obras.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
