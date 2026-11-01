# Frontend guide (`apps/web`)

React, Vite and TypeScript with React Router (declarative), the Zod contracts of `@dokimos/shared`, shadcn **Base UI**, Tailwind v4 with CSS Modules and semantic theme tokens (ADR-002). Do not add TanStack Query, Redux, React Hook Form or another primitive foundation without a reviewed need. Components and visual semantics: [UI guide](src/components/ui/README.md). The root [AGENTS.md](../../AGENTS.md) holds the commands and domain invariants.

## Structure

- Screens, hooks, domain helpers and API calls live in `src/features/<feature>/`: `purchase-orders`, `projects`, `coa`, `users`, `suppliers`, `audit`, `notifications`. A feature with several screens is grouped by screen, never by file type (`purchase-orders/{list,new,detail}`, `projects/{list,detail}`, `coa/{editor,view}`); what several screens share, and the feature's `api.ts`, stay at the feature root. Small features stay flat.
- `auth/` is sign-in and session, `app/` the shell and account menu, `components/` shared presentation, `components/ui/` primitives, `lib/` cross-cutting code. Each `api.ts` calls `request()` from `lib/api.ts`; import contracts straight from `@dokimos/shared`. No barrels, aggregators or compatibility facades.
- Imports stay acyclic. Shared code never imports a feature, and `coa` never imports project-page code. Concrete cross-feature imports are fine where one workflow composes another.
- A page owns its state and composes presentational pieces. A creation form is its own dialog component (`NewUserDialog`, `NewSupplierDialog`, `NewProjectDialog`) that owns the form, validation and recovery; the page owns the list. Split by responsibility before a file gets long. Prefer early returns and lookup tables to nested ternaries. Comments explain a non-obvious reason, never the code.
- Files in `components/ui/` are PascalCase, except those installed from a registry (`button`, `dialog`, the `chevrons-*` icons), which keep their registry names. Do not do case-only renames.

## Behavior to preserve

- Order and audit URL values are checked locally before reaching the API; browser-only context never reaches a strict API query schema.
- A successful response with a malformed body is an uncertain outcome, not an `ApiError`. Keep the token-scoped protection against a late `401`.
- A newer confirmed write or reconciliation must invalidate older reads that could overwrite it. Keep abort and unmount guards; use targeted regression tests, not a global cache.
- Audit date filters are local calendar days with an exclusive upper bound; build each local midnight separately so DST cannot shift it.
- When a dialog closes while its page stays mounted, keep its draft, errors and recovery state. Block dismissal during a pending write. Leaving the new-order page discards its fields but not an unresolved submission marker.
- Do not restore: extra count reads or per-card member reads (use the list's `distribution` and `membership`), periodic polling, or a development component catalog.

## Copy (pt-BR)

- Follow the [glossary](../../docs/README.md#glossary). The rule is the **alçada** (published, not saved); an order's approvers are its **cadeia**; one entry is a **nível**, one position of an order a **etapa**. Say **usuário**, never "pessoa". Speak to the reader as **você** ("sua decisão", "seu rascunho"), never in the first person ("minha decisão", "meu rascunho") and never as the system ("recarregamos"); say what happened instead ("foi recarregado"). "Cadastrar pedido" is kept from the challenge; elsewhere use "Criar". "Logout" and "Demo" stay as they are.
- State an effect on existing records concretely and only before a destructive action. Do not add reassurance such as "o histórico será preservado" after the fact.
- Use the `plural()` helper in `lib/format.ts`; never hard-code a plural next to a number.

## Tests

- `test/` is grouped like the app (`orders`, `projects`, `admin`, `audit`, `app`, `e2e`, `unit`) with shared helpers in `test/support` (`api.ts` starts the API and creates each spec's data, `session.ts` signs a page in).
- Prefer journeys and recovery behavior to presentation details. Tests take no screenshots; Playwright keeps traces and screenshots on failure only.
- Run one spec with `npm test -- web <file>.spec.ts`; the pure modules run with `npm test -- unit`.
