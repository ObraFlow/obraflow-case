# ADR-002 — Frontend SPA, Components, Styling, and State Boundaries

**Status:** Accepted — 2026-10-21  
**Consolidated:** 2026-10-21  
**Scope:** ObraFlow frontend technical foundation  
**Related:** [ADR-003](ADR-003-authentication-authorization.md), [ADR-008](ADR-008-monetary-precision-calculation.md), [ADR-009](ADR-009-http-api-contract.md)

## Context

ObraFlow is a small, authenticated, local-first purchase-order and sequential-approval application with a separate Fastify API. The frontend must represent the server's authoritative workflow, support structured purchase-order inputs and an approval configuration editor, and remain understandable to a reviewer under the challenge deadline.

We prefer familiar libraries where they solve a concrete requirement and explicitly avoid state, caching, styling, or form abstractions whose maintenance costs exceed their benefit at this scope. The choices below were individually reviewed and the consolidated decision was **explicitly accepted on 2026-10-21**.

## Decision

### 1. Application and navigation

- Build a client-rendered **React single-page application** using **Vite** and **TypeScript with strict type checking**.
- Use **React Router in Declarative mode** for navigation, nested routes/layouts and path parameters.
- React Router owns **URL search parameters** as well, through its normal API (e.g. `useSearchParams`). Purchase-order filters and pagination may be reflected in a shareable URL, such as `/purchase-orders?status=PENDING&page=2`.
- No server-side rendering, React Server Components, full-stack frontend framework, TanStack Router or specialized URL-state library (`nuqs`) is required for this application.

### 2. HTTP, server data and mutations

- Use a **small typed `fetch`-based HTTP client** for API base paths, the accepted Bearer authorization header, JSON parsing, and the consistent error envelope defined by ADR-009.
- Use focused page/feature hooks for loading, data, error, cancellation and explicit refetch state. Avoid a general frontend server-state cache.
- Use named API functions for writes (`createPurchaseOrder`, `decidePurchaseOrder`, `replaceCoa`), with local pending/error handling; after a successful command, reconcile with its authoritative response and explicitly refresh any affected visible data as needed.
- Handle `400` field-validation details distinctly from `409` domain/concurrency conflicts. On stale approval steps or CoA versions, do not invent the next state in the browser: obtain the current server representation and show the conflict.
- Where current data is needed, use **targeted, view-scoped polling** rather than background polling for every resource. Prevent overlapping requests, stop when the view unmounts or becomes irrelevant, and guard against stale results using `AbortController` or equivalent cleanup. The cadence, exact pages and later event-driven upgrade belong to implementation/phase planning, not this ADR.
- **Do not introduce TanStack Query**. It is a strong choice for larger systems with substantial shared caching, revalidation and mutation synchronization, but would add an additional state-management model here without enough practical value. Accept some explicit refetch/cancellation code; **do not recreate TanStack Query in-house**.
- Do not add Redux or Zustand initially. URL state belongs to the router; server reads to scoped hooks; unsaved form drafts to local React state. A narrow authentication context, if useful, is not a mandate for a general-purpose state store.

### 3. Validation and form state

- Use **Zod on frontend and backend**, reusing pure transport/request schemas and inferred types when doing so prevents the API contract from drifting.
- Shared schemas must remain independent of React, Fastify, TypeORM, database access, authorization services and application-specific persistence logic.
- Client validation improves immediacy of feedback; **all submitted input is independently validated again by the backend**, which alone enforces identity, access, active membership, CoA versioning, concurrency, financial calculations and state transitions.
- Map ADR-009's `400` `error.details` field paths (including `items.0.quantity`) to visible field errors. Treat `409` as a state-conflict/reload flow, not a Zod field error.
- Preserve ADR-008's **decimal-string** transport for quantities, prices, limits and totals. Do not use `z.coerce.number()`, `valueAsNumber`, or binary-number arithmetic for authoritative financial values.
- **Do not select React Hook Form now**. Start with native forms and React-controlled/local state, including dynamic PO lines and CoA edits. Reevaluate a focused form library only if actual field-array/error-handling complexity warrants it; do not build a custom general-purpose form framework.

### 4. Component system and styling responsibilities

- Use **shadcn/ui with Base UI** as the primary component/accessible-interaction foundation. Choose the **Base UI** implementation when bringing shadcn components into the repository.
- Treat shadcn-generated components as **local source we own and can modify**, not as a second styling engine. Use Base UI primitives for behavior-intensive interactions such as dialogs, popovers, menus and selects; compose domain-specific interfaces in ordinary React when that is clearer.
- **Do not default to Radix primitives** or mix alternative implementations of the same foundational component without a concrete reason. This is not a ban on incidental transitive dependencies.
- Use **Tailwind CSS v4** for layout, responsive rules, spacing and simple component presentation.
- Use **plain CSS Modules** (`.module.css`) as a first-class approach for highly styled components, intricate interaction states, selectors and animations; the approval timeline and CoA editor are likely candidates.
- Keep **semantic CSS custom properties** as shared design tokens for both Tailwind and CSS Modules. Avoid having classes and a CSS Module independently fight over the same CSS property on a single element.
- Named component variants mean selecting **existing CSS classes** through props (e.g. `variant="destructive"`); a tiny helper such as CVA may be used where convenient, but it is **not a mandatory abstraction** or CSS-in-JS.
- **No SCSS/Sass, styled-components or runtime CSS-in-JS**. Do not generate a CSS Module for each trivial component or move unreadably long class strings mechanically into another abstraction.

### 5. Color scheme, preferences and accessibility

- Support **Light / Dark / System**, with **System as the default**. In System mode follow `prefers-color-scheme` changes.
- Apply dark-mode tokens with a root `.dark` class, backed by the same semantic CSS variables. Apply the resolved preference early in startup to reduce incorrect-theme flashes.
- Persist only the **non-sensitive theme selection** in `localStorage`. This has no bearing on authentication-token storage.
- Use semantic pending/approved/rejected tokens, but **never convey workflow status by color alone**: text and icons must remain understandable in either theme.
- Do not add a theme-management library simply to toggle these three states.

### 6. Language and internationalization

Decided at the start of the project; written down on 2026-11-01.

- Ship the interface in **pt-BR only**, without an i18n library. Strings live in the components, and locale-dependent formatting uses `pt-BR` directly. API and shared validation messages are also in Portuguese.
- Building on i18n from the start pays off for a product sold across languages, because translating later means revisiting every string. Here the audience is Brazilian, and the real cost (catalogs for all strings, plurals, API messages and per-language tests) would deliver no value within the challenge's scope.
- This reduces the risk rather than removing it: the cost of migrating grows with the product. Stable English error codes and field paths already allow messages to be resolved in the client.
- Show the language as a **read-only** setting in the account panel, marking where a future preference would live.
- Revisit on a concrete requirement for a second language. Currency and tax handling are separate concerns, owned by ADR-008.

## Boundaries with previously accepted ADRs

- **ADR-003** owns authentication and backend authorization, including the challenge-scoped `sessionStorage` access JWT sent by explicit `Authorization: Bearer` headers. Browser-readable tokens carry known XSS exposure; switching visual themes or route libraries does not change that security posture. Logout clears browser auth state and any user-specific retained data; no token revocation is promised.
- **ADR-008** owns exact arithmetic, rounding and persisted totals. The frontend may display estimates, but the server-calculated totals and selected CoA are authoritative.
- **ADR-009** owns HTTP routes, request/response shapes, permissions, pagination and error contracts. The frontend must not add client-side assumptions that change them.

## Deliberately out of scope

Page inventory, login-screen presentation, demo-account switching UX, detailed navigation layout, view-specific empty/loading/error treatments, dialogs' copy, and final interaction designs are **deferred to page-definition/layout work**. These are not blockers to ratifying the frontend **technical architecture**.

This ADR does not add WebSockets, SSE, a global event bus or a generic cache. Future polling/event-driven delivery phases can reuse the same typed API/client-state boundaries without being specified here.

## Consequences and trade-offs

**Benefits:** A coherent, familiar React SPA; one owner for URL state; no competing query cache; Zod consistency across the transport boundary; accessible shadcn/Base UI primitives; readable complex styling; small dependency surface that demonstrates intentional architectural restraint.

**Costs and limitations:** Manual request cancellation/refetch coordination, local pending/error state and array-field management; local ownership of shadcn source; selective CSS Modules alongside utility CSS; client-rendered first paint; explicit handling of stale information across different users. These costs are acceptable at the challenge's size, but should be revisited if real implementation repetition grows.

**Revisit trigger:** Demonstrated difficulty coordinating repeated server reads, cache invalidation, or substantial dynamic-form error handling—not a speculative need for a library because it is common in larger React applications.

## Verification guidance

- Route path and URL-search state remain synchronized for page-based PO filters/pagination; invalid query parameters do not bypass backend validation.
- Authenticated HTTP requests attach the token correctly and handle `401` without exposing protected content; logging out clears relevant browser state.
- Page-scoped reads, refetch and polling do not leak timers or allow obsolete requests to overwrite newer route/data state.
- Creating or deciding a PO uses the server's full authoritative response; stale `409` conflicts result in fresh state and clear feedback.
- Frontend and backend reject invalid request shapes consistently; decimal strings preserve precision and backend totals remain authoritative.
- Light, dark and system modes respect saved preference and OS changes; status is readable without relying on color alone.
- Base UI behavior-intensive components retain keyboard and focus accessibility; custom CSS styling does not replace that behavior.

## Amendment (2026-11-01): polling and WebSockets

Two statements above did not survive implementation. **Targeted, view-scoped polling was never built:** pages read on load and when the person refreshes (the refresh buttons, or the explicit recovery after a conflict or an uncertain write), and there are no periodic timers. **WebSockets were later added** by [ADR-011](ADR-011-best-effort-realtime-po-notifications.md) as best-effort advisory hints with a browser-local inbox; REST and PostgreSQL remain authoritative. The remaining decisions stand: a typed `fetch` client, feature hooks without a general cache, no TanStack Query, Redux or React Hook Form, and URL state owned by the router.

## Acceptance

**Accepted on 2026-10-21.** The assembled frontend technical architecture was explicitly approved after review of its component, routing, validation, styling, theme and state-management choices. Page-specific UX/layout decisions remain out of scope and will be reviewed independently.
