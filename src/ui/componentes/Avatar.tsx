import { CLASSE_DO_AVATAR, corDoAvatar, iniciais } from './rotulos'

/** Círculo com as iniciais, como nos artboards. 32px é o tamanho do cabeçalho e do modal. */
export function Avatar({
  id,
  nome,
  tamanho = 32,
}: {
  id: string
  nome: string
  tamanho?: number
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-[650] ${CLASSE_DO_AVATAR[corDoAvatar(id)]}`}
      style={{ width: tamanho, height: tamanho }}
    >
      {iniciais(nome)}
    </span>
  )
}
