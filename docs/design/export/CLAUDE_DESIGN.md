# ObraFlow — Dokimos · Handoff para Claude Code

> Módulo de pedidos de compra com cadeia de aprovação sequencial (alçadas).
> Stack: **Next.js 14 (App Router) + Tailwind CSS + shadcn/ui**.
> Design de referência: arquivos `*.dc.html` nesta pasta (abra no Dokimos canvas para ver todas as telas).

---

## 1. Visão geral do produto

**ObraFlow** é um ERP B2B para construtoras.
**Dokimos** é o módulo de compras: um comprador cria um pedido, e ele percorre uma cadeia de aprovadores definida pelas **alçadas** da obra — até ser aprovado ou rejeitado.

### Papéis (personas)

| Avatar | Nome | Role | Pode |
|---|---|---|---|
| BL | Beatriz Lima | Compradora | Criar pedidos |
| JR | João Ribeiro | Engenheiro | Aprovar/rejeitar (1ª etapa em Faixa 2 e 3) |
| AC | Amanda Costa | Ger. Suprimentos | Aprovar/rejeitar + configurar alçadas |
| CM | Carlos Mendes | Dir. Financeiro | Aprovar/rejeitar (3ª etapa em Faixa 3) |

---

## 2. Regras de negócio — NÃO alterar

1. **Faixas não são cumulativas**: cada faixa cobre um intervalo exclusivo de valor (ex.: Faixa 1 ≤ R$10.000; Faixa 2 R$10.001–R$50.000; Faixa 3 > R$50.000).
2. **Aprovação estritamente sequencial**: aprovador N+1 só pode agir após N ter aprovado. Se N não atuou, o botão de N+1 fica desabilitado com aviso.
3. **Rejeição com motivo obrigatório** (textarea, min 10 chars) — encerra o fluxo; o pedido não pode ser retomado.
4. **Pedido bloqueado sem faixa**: se o total não cobre nenhuma faixa configurada na obra, o pedido não pode ser submetido (`NoRule.dc.html`).
5. **Sem edição pós-cadastro**: nenhuma tela expõe "Editar" em pedido já cadastrado.
6. **Alçadas restritas a gestores**: apenas roles `MANAGER` e `DIRECTOR` acessam `/alcadas`. Role `ENGINEER` e `BUYER` recebem 403 (`Alc_Unauthorized.dc.html`).

---

## 3. Design system → Tailwind

Os tokens do design são **literalmente as cores padrão do Tailwind** — zero customização de paleta necessária.

```js
// tailwind.config.js  (ver arquivo completo ao lado)
theme: {
  extend: {
    colors: {
      // accent (amber-600 padrão do Tailwind)
      accent: colors.amber[600],       // #d97706
      // semânticas
      success: colors.green,           // --green: green-600 = #16a34a
      warning: colors.amber,           // --amber: amber-600
      danger:  colors.red,             // --red:   red-600  = #dc2626
      info:    colors.blue,            // --blue:  blue-600 = #2563eb
      // neutrals
      surface: colors.zinc,            // sidebar zinc-900, borders zinc-200
    },
    borderRadius: { DEFAULT: '8px', lg: '12px' },
    fontVariantNumeric: { tabular: 'tabular-nums' },
  }
}
```

### Mapeamento direto token → classe Tailwind

| Token CSS | Classe Tailwind |
|---|---|
| `--bg:#fafafa` | `bg-zinc-50` |
| `--surface:#fff` | `bg-white` |
| `--surface2:#f4f4f5` | `bg-zinc-100` |
| `--border:#e4e4e7` | `border-zinc-200` |
| `--text:#09090b` | `text-zinc-950` |
| `--text2:#52525b` | `text-zinc-600` |
| `--muted:#a1a1aa` | `text-zinc-400` |
| `--sb:#18181b` | `bg-zinc-900` |
| `--accent:#d97706` | `bg-amber-600` / `text-amber-600` |
| `--green:#16a34a` | `text-green-600` |
| `--green-lt:#f0fdf4` | `bg-green-50` |
| `--green-bd:#bbf7d0` | `border-green-200` |
| `--green-dk:#14532d` | `text-green-900` |
| `--red:#dc2626` | `text-red-600` |
| `--red-lt:#fef2f2` | `bg-red-50` |
| `--amber-lt:#fffbeb` | `bg-amber-50` |
| `--blue:#2563eb` | `text-blue-600` |
| `--blue-lt:#eff6ff` | `bg-blue-50` |

### Modo escuro
Use `dark:` variants do Tailwind. Referência de valores: `DarkMode_Ped.dc.html`.

---

## 4. Componentes shadcn/ui a instalar

```bash
npx shadcn@latest add \
  button badge table skeleton \
  dialog sheet drawer \
  sonner tooltip \
  select input textarea label \
  separator scroll-area \
  avatar progress
```

### Mapeamento componente → shadcn

| Componente visual | shadcn/ui |
|---|---|
| Sidebar | custom (`<aside>`) — não tem equivalente direto |
| Badge de status | `<Badge variant="outline">` com className semântica |
| Drawer de pedido | `<Sheet side="right">` (desktop) / `<Drawer>` (mobile) |
| Modal de rejeição | `<Dialog>` |
| Toast de sucesso/erro | `<Sonner>` (sonner) — `toast.success()` / `toast.error()` |
| Skeleton de carregamento | `<Skeleton>` |
| Select de Obra | `<Select>` do shadcn (com estado `disabled` durante fetch) |
| Tabela de pedidos | `<Table>` — sem sorting no MVP |
| Confirm remover item | `<Dialog>` de confirmação |
| Dots de aprovação | custom `<ApproverDot>` (22px, circle, variante: done/wait/idle/err) |
| Régua de faixas | custom `<TierRuler>` (flex, segmentos coloridos + eixo de ticks) |

---

## 5. Estrutura de rotas (App Router)

```
app/
  (auth)/
    login/page.tsx
  (app)/
    layout.tsx              ← sidebar + topbar
    obras/page.tsx
    pedidos/
      page.tsx              ← lista (Ped_List)
      novo/page.tsx         ← formulário (Main)
      [id]/page.tsx         ← drawer detail (Ped_DrawerPending etc.)
    alcadas/
      page.tsx              ← Alc_Main (requer role MANAGER|DIRECTOR)
      [obraId]/page.tsx
```

---

## 6. Inventário de telas e arquivos de referência

### Novo Pedido
| Arquivo | Variação |
|---|---|
| `Main.dc.html` | a) Válido, preenchido — estado padrão interativo |
| `Errors.dc.html` | b) Erros de validação inline |
| `NoRule.dc.html` | c) Total sem faixa de alçada — bloqueia submit |
| `LastItem.dc.html` | d) Confirmar remoção do único item |
| `Mobile.dc.html` | e) Layout 375 px |
| `EmptyState.dc.html` | f) Sem obras cadastradas — empty state |
| `Toast_NovoPed.dc.html` | g) Toast "Pedido #13 cadastrado" pós-submit |
| `NovoPed_Skeleton.dc.html` | n) Skeleton enquanto obras carregam |

### Pedidos — lista e drawers
| Arquivo | Variação |
|---|---|
| `Ped_List.dc.html` | a) Lista completa — interativa |
| `Ped_DrawerPending.dc.html` | b) Drawer pendente (sua vez) — aprovar/rejeitar |
| `Ped_DrawerApproved.dc.html` | c) Drawer aprovado — somente leitura |
| `Ped_DrawerRejected.dc.html` | d) Drawer rejeitado — somente leitura + motivo |
| `Ped_RejectModal.dc.html` | e) Modal de rejeição com erro de validação |
| `Ped_Skeleton.dc.html` | f) Skeleton da lista |
| `Ped_Empty.dc.html` | g) Lista vazia |
| `Ped_APIError.dc.html` | h) Erro de API — "Tentar novamente" |
| `Ped_Toast.dc.html` | i) Toast de conflito (outro aprovador agiu antes) |
| `Ped_Mobile.dc.html` | j) Mobile — lista |
| `Toast_Ped.dc.html` | k) Toast "Pedido aprovado" |
| `DarkMode_Ped.dc.html` | l) Modo escuro — lista |
| `Toast_Ped_Reject.dc.html` | o) Toast "Pedido rejeitado" |
| `Ped_DrawerBlocked.dc.html` | p) Drawer — aprovador anterior ainda pendente |
| `Ped_PostSubmit.dc.html` | q) Pós-cadastro — #13 no topo da lista |
| `Ped_MobileDrawer.dc.html` | r) Mobile — bottom-sheet de aprovação |

### Alçadas
| Arquivo | Variação |
|---|---|
| `Alc_Main.dc.html` | a) Ed. Maré — 3 faixas configuradas — interativo |
| `Alc_Alert.dc.html` | b) Alerta — sem faixa ∞ |
| `Alc_Modal.dc.html` | c) Modal — arrastar aprovador |
| `Alc_ModalErrors.dc.html` | d) Modal — erros de validação |
| `Alc_Empty.dc.html` | e) Sem faixas — empty state |
| `Alc_Skeleton.dc.html` | f) Skeleton + Erro de API |
| `Alc_Mobile.dc.html` | g) Mobile |
| `Toast_Alc.dc.html` | h) Toast "Faixa salva" |
| `Alc_Unauthorized.dc.html` | s) Acesso negado (role insuficiente) |

---

## 7. Padrões de implementação

### Toast (usar Sonner)
```tsx
import { toast } from 'sonner'

// Sucesso
toast.success('Pedido #13 cadastrado', {
  description: 'Encaminhado para aprovação de João Ribeiro',
})

// Erro / conflito
toast.error('Pedido já foi aprovado', {
  description: 'Amanda Costa atuou antes de você. Atualize a página.',
})

// Rejeição
toast.error('Pedido #8 rejeitado', {
  description: 'Solicitante notificado · Motivo: Preço acima do mercado',
})
```

### Highlight de linha (pós-ação)
```tsx
// Adicionar ?highlight=13 na URL após redirect, remover após 3s
const searchParams = useSearchParams()
const highlightId = searchParams.get('highlight')

<TableRow className={cn(highlightId === row.id && 'bg-green-50 transition-colors duration-700')}>
```

### ApproverDot
```tsx
type DotVariant = 'done' | 'wait' | 'idle' | 'err'

const variants: Record<DotVariant, string> = {
  done: 'bg-green-50 text-green-900 border-green-200',
  wait: 'bg-amber-50 text-amber-900 border-amber-200',
  idle: 'bg-zinc-100 text-zinc-400 border-zinc-200',
  err:  'bg-red-50  text-red-900  border-red-200',
}

export function ApproverDot({ initials, variant }: { initials: string; variant: DotVariant }) {
  return (
    <div className={cn('w-[22px] h-[22px] rounded-full border-[1.5px] grid place-items-center text-[9px] font-bold', variants[variant])}>
      {initials}
    </div>
  )
}
```

### Drawer bloqueado (aprovação sequencial)
```tsx
const canAct = order.approvalChain
  .slice(0, myStepIndex)
  .every(step => step.status === 'approved')

<Button disabled={!canAct} ...>Aprovar</Button>
{!canAct && (
  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
    Aguardando aprovação de {order.approvalChain[myStepIndex - 1].name} na etapa anterior.
  </p>
)}
```

---

## 8. API endpoints esperados (contratos mínimos)

```
GET  /api/obras                          → { id, name }[]
GET  /api/pedidos?filter=mine|pending    → Pedido[]
POST /api/pedidos                        → { id: number }
GET  /api/pedidos/:id                    → PedidoDetail
POST /api/pedidos/:id/approve            → { ok: true } | { conflict: true }
POST /api/pedidos/:id/reject             → { ok: true }   body: { motivo: string }
GET  /api/alcadas/:obraId               → Alçada[]
PUT  /api/alcadas/:obraId               → Alçada[]
```

Se `POST /approve` retornar `{ conflict: true }`, exibir o toast de conflito (`Ped_Toast.dc.html`).
