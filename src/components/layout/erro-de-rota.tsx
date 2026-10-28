"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Corpo comum dos error.tsx das telas. No Next 16 o boundary recebe `retry`, que
 * refaz a busca e re-renderiza o segmento (o antigo `reset` só limpa o estado).
 */
export function ErroDeRota({
  error,
  retry,
  titulo,
}: {
  error: unknown;
  retry: () => void;
  titulo: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-rejeitado bg-rejeitado-fundo p-5 text-rejeitado-texto-escuro">
      <div>
        {/* O boundary substitui a página inteira, então o título do erro é o h1 da página. */}
        <h1 className="text-2xl font-bold tracking-[-0.015em]">{titulo}</h1>
        <p className="text-sm">
          O servidor não respondeu ou o banco de dados está indisponível. Seus dados não foram
          perdidos.
        </p>
      </div>
      <Button type="button" onClick={() => retry()} className="w-fit">
        Tentar novamente
      </Button>
    </div>
  );
}
