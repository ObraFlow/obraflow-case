"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { gravarPreferencia, useTema, type PreferenciaTema } from "@/components/layout/tema";
import { cn } from "@/lib/utils";

const OPCOES: ReadonlyArray<{
  valor: PreferenciaTema;
  rotulo: string;
  Icone: typeof Sun;
}> = [
  { valor: "light", rotulo: "Claro", Icone: Sun },
  { valor: "dark", rotulo: "Escuro", Icone: Moon },
  { valor: "sistema", rotulo: "Sistema", Icone: Monitor },
];

/**
 * Botão de ícone no header, do mesmo tamanho do sino, que abre um grupo de três opções
 * (Claro / Escuro / Sistema). O ícone do botão mostra a preferência, não o tema em vigor:
 * quem escolheu "Sistema" vê o monitor, mesmo que o sistema esteja escuro.
 * Até a hidratação o snapshot é "sistema" (components/layout/tema.ts), então o botão
 * nasce com o monitor e troca para a escolha salva logo em seguida, sem erro de hidratação.
 */
export function SeletorTema() {
  const preferencia = useTema();
  const [aberto, setAberto] = useState(false);
  const atual = OPCOES.find((opcao) => opcao.valor === preferencia) ?? OPCOES[2];

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger
        aria-label={`Tema: ${atual.rotulo}`}
        title={`Tema: ${atual.rotulo}`}
        className="flex size-10 items-center justify-center rounded-sm text-header-foreground/85 transition-colors hover:text-header-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-8"
      >
        <atual.Icone className="size-5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div role="radiogroup" aria-label="Tema" className="flex flex-col">
          {OPCOES.map((opcao) => {
            const marcado = opcao.valor === preferencia;
            return (
              <button
                key={opcao.valor}
                type="button"
                role="radio"
                aria-checked={marcado}
                onClick={() => {
                  gravarPreferencia(opcao.valor);
                  setAberto(false);
                }}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-sm px-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none sm:h-9",
                  marcado ? "font-semibold" : "font-medium",
                )}
              >
                <opcao.Icone className="size-4 shrink-0" aria-hidden="true" />
                {opcao.rotulo}
                {/* O estado marcado também em texto (docs/design.md: a cor acompanha, não substitui). */}
                {marcado && <span className="ml-auto text-xs text-muted-foreground">atual</span>}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
