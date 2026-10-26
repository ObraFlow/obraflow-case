---
name: nova-tela
description: Receita de arquitetura para criar uma tela nova no ObraFlow (page RSC + loading + error + componentes + action com Zod + estados). Use ao implementar pedidos/novo, aprovacoes, regras ou qualquer rota em app/(telas).
argument-hint: <rota> (ex.: aprovacoes)
---

# Nova tela: `$ARGUMENTS`

Siga a ordem. Cada passo cita a regra do `CLAUDE.md` que ele cumpre.

## 0. Antes de escrever código

- Leia `.claude/skills/ui-obraflow/SKILL.md` (padrões e anti-IA) e, para a API do Next, a skill `next16` (qual doc local ler).
- Confirme que o service necessário existe em `src/server/services/`. Se não existir, pare e proponha o service primeiro: **UI nunca importa Prisma**.
- Proponha em poucas linhas o desenho da tela (quais blocos, o que é RSC e o que é client) e espere OK.

## 1. Página (Server Component)

`src/app/(telas)/<rota>/page.tsx`
- `async function Page()`; lê dados chamando o service diretamente (sem fetch para a própria API).
- Lê o usuário "Agindo como" do cookie via helper em `src/server/` (nunca direto na UI).
- Passa dados **serializáveis** para componentes client: `Decimal` → string, `Date` → ISO string, centavos como `number`.
- Sem `"use client"` aqui.

## 2. Estados da rota

- `loading.tsx`: `Skeleton` com o mesmo formato da tabela/formulário da tela.
- `error.tsx`: `"use client"`, recebe `{ error, reset }`, mostra mensagem em pt-BR e botão "Tentar novamente" chamando `reset()`.
- Empty state dentro do componente de lista, não em arquivo separado.

## 3. Componentes de tela

`src/components/<rota>/`
- Um componente por bloco: `tabela-pedidos.tsx`, `timeline-alcada.tsx`, `formulario-pedido.tsx`, `dialog-rejeitar.tsx`…
- `"use client"` **só** onde há interação (form, dialog, botão com estado). Tabela de leitura fica RSC.
- Componentes shadcn vêm de `@/components/ui`; não criar primitivos novos.
- Dinheiro só entra e sai pelos helpers de `src/lib/money.ts` (centavos ↔ BRL).

## 4. Mutação

`src/server/actions/<rota>.ts`
- `"use server"`; cada action valida a entrada com o schema de `src/lib/schemas/` via `safeParse`; retorna `{ ok: true, data } | { ok: false, erro }` em vez de lançar, para a UI mostrar a mensagem.
- Chama o service; nunca toca o Prisma.
- `revalidatePath` da rota afetada ao final.
- Erros de regra de negócio (409 etc.) viram `erro` com a mensagem específica do service, exibida em toast (`sonner`).

## 5. Formulário (quando houver)

- `react-hook-form` + `zodResolver` com o **mesmo** schema da action.
- Itens com `useFieldArray`; começa com um item em branco.
- Total do item e do pedido calculados na UI só para exibição; o server recalcula e persiste.
- Botão de envio desabilitado enquanto `!formState.isValid`, com texto ao lado dizendo o que falta.

## 6. Verificação antes de encerrar

1. `npm run check` verde.
2. Abrir no browser embutido (skill `run`, config `dev`) em 375 e 1280. Provocar: lista cheia, lista vazia, submit inválido, erro de server (parar o Postgres com `npm run db:down` e recarregar; subir de novo depois).
3. Passar a auto-revisão de 6 perguntas da `ui-obraflow`.
4. Rodar o agente `critico-visual` na rota e corrigir o Top 3.
5. Não commitar: sugerir a mensagem em bloco `bash` (um comando por bloco).
