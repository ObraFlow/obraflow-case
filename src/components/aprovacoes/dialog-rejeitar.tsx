"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormState, useWatch } from "react-hook-form";
import { CampoMotivo } from "@/components/aprovacoes/campo-motivo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rejeicaoFormSchema, type RejeicaoFormInput } from "@/lib/schemas/decisao";

/**
 * Motivo obrigatório da rejeição (decisão de produto 4). O Zod barra antes do submit:
 * o botão só habilita com motivo, e a frase ao lado diz o que falta. O domínio barra de novo.
 * Quem chama monta o dialog só enquanto aberto, então o form nasce vazio a cada abertura.
 */
export function DialogRejeitar({
  pedidoId,
  aoFechar,
  confirmar,
  enviando,
}: {
  pedidoId: number;
  aoFechar: () => void;
  confirmar: (motivo: string) => void;
  enviando: boolean;
}) {
  const form = useForm<RejeicaoFormInput>({
    resolver: zodResolver(rejeicaoFormSchema),
    defaultValues: { motivo: "" },
    mode: "onChange",
  });
  const { errors: erros, isValid } = useFormState({ control: form.control });
  const motivo = useWatch({ control: form.control, name: "motivo" });

  const enviar = form.handleSubmit((valores) => confirmar(valores.motivo));

  return (
    <Dialog
      open
      onOpenChange={(abrir) => {
        if (!abrir && !enviando) aoFechar();
      }}
    >
      <DialogContent>
        <form onSubmit={enviar} noValidate className="flex min-w-0 flex-col gap-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Rejeitar o pedido #{pedidoId}?</DialogTitle>
            <DialogDescription>
              A rejeição encerra a cadeia: os aprovadores seguintes não serão chamados e o motivo
              fica registrado no histórico do pedido.
            </DialogDescription>
          </DialogHeader>

          <CampoMotivo
            id="rejeicao-motivo"
            registro={form.register("motivo")}
            erro={erros.motivo}
            valor={motivo ?? ""}
            autoFocus
          />

          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {!isValid && (
              <p className="text-sm text-muted-foreground sm:mr-auto">
                Informe o motivo para rejeitar.
              </p>
            )}
            <Button type="button" variant="outline" onClick={aoFechar} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || enviando}
              className="bg-rejeitado text-white hover:bg-rejeitado/85"
            >
              {enviando ? "Rejeitando…" : "Rejeitar pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
