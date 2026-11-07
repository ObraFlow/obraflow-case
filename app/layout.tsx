import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Cabecalho, CabecalhoEsqueleto } from "@/src/ui/componentes/Cabecalho";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], style: ["italic"], variable: "--font-lora" });

export const metadata: Metadata = {
  title: "ObraFlow · Aprovações",
  description: "Aprovação de pedidos de compra por alçada.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${lora.variable} flex min-h-screen flex-col font-sans antialiased`}
      >
        {/* O cabeçalho depende da sessão, que é dado de requisição: dentro de um Suspense, a
            casca da página é prerrenderizada e só a faixa de identidade espera. Sem a fronteira,
            toda página bloquearia até o banco responder (Cache Components do Next 16). */}
        <Suspense fallback={<CabecalhoEsqueleto />}>
          <Cabecalho />
        </Suspense>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
