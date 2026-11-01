import { SeletorAgindoComo } from "@/components/layout/seletor-agindo-como";
import { SinoPendencias } from "@/components/layout/sino-pendencias";
import { Skeleton } from "@/components/ui/skeleton";
import { listarUsuarios } from "@/server/services/cadastros";
import { usuarioAtualId } from "@/server/usuario-atual";

/**
 * Lê a lista de usuários (cacheada) e o cookie, e entrega ao seletor client. O sino de
 * pendências fica ao lado e remonta a cada troca de usuário (`key`), para a lista anterior
 * não virar "novidade" do usuário seguinte.
 */
export async function AgindoComo() {
  const [usuarios, atualId] = await Promise.all([listarUsuarios(), usuarioAtualId()]);
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <SeletorAgindoComo usuarios={usuarios} usuarioAtualId={atualId} />
      {atualId !== null && <SinoPendencias key={atualId} usuarioAtualId={atualId} />}
    </div>
  );
}

/** Mesmo tamanho do seletor, para o header não pular quando o cookie chega. */
export function AgindoComoSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-header-foreground/75 max-sm:sr-only">Agindo como</span>
      <Skeleton className="h-10 w-40 bg-header-foreground/20 sm:h-8 sm:w-44" />
      <Skeleton className="size-10 bg-header-foreground/20 sm:size-8" />
    </div>
  );
}

/**
 * Primeira visita, sem cookie: a única situação em que o amarelo aparece sem pedido,
 * porque há uma ação necessária antes de qualquer outra.
 */
export async function AvisoSemUsuario() {
  const atualId = await usuarioAtualId();
  if (atualId !== null) return null;

  return (
    <div className="bg-sinalizacao text-sinalizacao-foreground">
      <p className="mx-auto max-w-[1200px] px-4 py-2 text-sm font-medium sm:px-8">
        Escolha no seletor &ldquo;Agindo como&rdquo; quem está usando o sistema para ver suas
        pendências e decidir pedidos.
      </p>
    </div>
  );
}
