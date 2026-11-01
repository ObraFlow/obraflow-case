# Frontend workflows and persistence boundaries

**Updated:** 2026-10-31. This guide describes current behavior; historical rationale and superseded decisions remain in the [ADRs](../README.md#decision-register).

## Feature ownership and dependencies

Features own resource-specific screens, workflows, state, response validation and API operations, with CSS Modules beside their components. Owners are `features/purchase-orders`, `projects`, `coa`, `users`, `suppliers`, `audit` and `notifications`. Purchase orders own saved approval snapshots and `useCoaPreview`; live CoA configuration/calculation utilities belong to CoA. `ProjectDetail` composes project lifecycle, membership and CoA. Users and suppliers have independent workflows/APIs and share presentation through `components/directory/`, without a generic CRUD controller.

Each resource's `api.ts` calls `lib/api.ts` directly and imports contracts from `@dokimos/shared`. Auth operations/session/login belong in `auth/`; `App.tsx` and `app/` compose routes, shell, account and the render error boundary. Shared presentation belongs in `components/`, primitives in `components/ui/`, and cross-cutting transport/formatting/money/theme utilities in `lib/`. Concrete cross-feature API/utility imports are allowed for existing workflows, but shared infrastructure must not depend on features and CoA must not import project-page implementations. Keep imports acyclic; avoid aggregators, compatibility facades and speculative layers.

## Ownership and persistence

- React Router **Declarative** owns paths, URL filters and pagination. Protected routes wait for session validation. Ordinary-user admin deep links fail before administration data loads; the API independently enforces authorization.
- The narrow auth context owns identity, `/auth/me` restoration, logout and token lifecycle. The JWT stays in `sessionStorage`, passwords are never stored, and a session change remounts private views. Late failures from an old token cannot invalidate a newer session. Browser-readable JWTs and lack of server-side revocation are local-challenge limitations ([ADR-003](../decisions/ADR-003-authentication-authorization.md)).
- Initial anonymous deep links may return after login. Logout/protected `401` clears the private return destination; the next login opens `/purchase-orders`. Login `401` stays in the form; protected `401`, `403` and concealing `404` receive distinct handling.
- Demo personas use the normal username/password endpoint and public seed defaults. A failed switch keeps the current session; success resets list context and clears previous-user views. There is no impersonation endpoint or role override.
- Pages/hooks own reads, local drafts, pending state and refresh. Obsolete reads are aborted/ignored, and newer confirmed mutations/reconciliation invalidate reads that could overwrite them. There is no global query cache or periodic polling; Socket.IO hints do not replace authoritative reads.
- Order/audit URL-to-API queries are allowlisted and validated. UI context never reaches strict API schemas. Malformed successful JSON/DTOs are uncertain outcomes, distinct from definite `ApiError` responses. Field details are normalized safely; no write is automatically replayed.
- Quantities/amounts remain strings. Display grouping uses `BigInt` for exact integer parts; floating-point conversion never selects approval authority or rewrites money.

## Routes and shell

Public `/login` offers credentials and a separate grouped demo picker. Groups describe seeded scenarios, not authorization roles. Returning preserves credential fields and focus; password visibility is presentation only. Stable Pravatar URLs use canonical usernames, with initials fallback and no authorization dependency on external images.

The authenticated desktop shell has a collapsible sidebar, regular PO navigation and ADMIN-only Obras/Fornecedores/Usuários/Auditoria links. Account/theme/logout live in a non-modal Base UI popover anchored to the sidebar account card, portaled outside its scroll container. There is no persistent desktop horizontal header. Pages own headings, context, filters and primary actions.

Below 900px a sticky safe-area-aware menu/brand/avatar bar replaces the sidebar. The left drawer contains navigation only. The header avatar opens a separate account popover containing identity, appearance, read-only language, notifications, logout and demo switching. Account panels remain viewport-constrained, support Escape/outside dismissal and focus restoration, and do not add a backdrop. The navigation drawer uses modal focus management. Reduced motion disables movement effects; no bottom navigation exists.

## Purchase-order list

`/purchase-orders` has URL-owned project/view/page filters, a desktop comparison table and mobile cards. Each order shows its complete backend-provided saved approval chain: completed, current, future and skipped-after-rejection steps. Names and accessible labels accompany state colors; the current step has `aria-current="step"`. Long chains scroll within their container. The browser never reconstructs saved assignments from live CoA.

The views Todos, Sua decisão, Pendentes, Aprovados and Rejeitados use **one `GET /purchase-orders` response**, including its `distribution`: `total`, `actionableByMe` and `byStatus`. Distribution covers all orders visible to the actor in the selected project, independent of status/actionable filters and pagination. Page, filtered count and distribution share the backend read snapshot. Changing project hides previous-project counts until a new response; list failure uses the existing list error/retry, without separate count-only recovery. Selecting a view preserves project and resets pagination. Wide bars show view buttons/counts; narrow bars use two selectors.

Creation prerequisites use `GET /projects`'s `membership.isMember`, activity and published CoA version, plus active supplier availability. ADMIN reads do not imply membership. Unknown/failed references block new creation with specific retry/guidance, while supplier failures leave the list readable. A pending/uncertain submission always retains a follow/review entry, even when prerequisites change. Approvals/rejections remain **detail-first**, with no list mutation actions ([ADR-010](../decisions/ADR-010-detail-first-purchase-order-decisions.md)).

## Purchase-order creation

**Novo pedido** navigates to `/purchase-orders/new`. Legacy list `mode=create` links redirect there. The dedicated page retains allowlisted list context for return navigation and starts with one stable-keyed item. An eligible project from the list filter, or the only eligible configured project, is preselected. An untouched initial read with no member projects returns to the list; drafts, unknown references and unresolved submissions retain recovery context.

The form owns ephemeral general fields/items, inline feedback and an exact live summary. Leaving/reloading discards unsaved fields; there is no browser-persisted form draft or draft endpoint. Reference retries and definite write failures retain fields while mounted. Active member projects/suppliers are read through feature APIs. `useCoaPreview` reads the selected project's published ladder and members with cancellation and scoped retry; reference refresh never grants approval or creation authority.

Shared Zod schemas validate blur/submission and backend field paths map to associated inputs. Quantities accept comma or period and normalize to period-separated strings. Unit prices use BRL input: digits enter whole reais; comma/period starts the fraction, formatted/canonical paste is accepted, and blur pads cents. A blank `0,00` placeholder is still required input; explicit zero is valid. Excess precision is retained for validation rather than silently rounded.

A local `decimal.js` instance (precision 40) rounds each line HALF_UP and sums rounded lines, checking the NUMERIC(18,2) ceiling. Invalid/overflowing fields or unavailable selections prevent submission; the page can reveal/focus invalid fields. Adding/removing items maintains stable identity and contextual errors/focus. A sticky mobile submit bar retains the total and field guidance.

**Cadastrar pedido** opens a separate final review dialog with items, exact estimated total and the advisory cumulative chain/version. Cancelling returns to the intact draft. Only final confirmation issues the original validated request DTO, without client totals or a chosen approval snapshot. The server resolves its current configuration and commits the authoritative result. Pending/in-flight guards prevent repeated sends; leaving the page does not cancel a request. A validated successful response opens the persisted detail; transient navigation state is cleared so subsequent reads are current.

**Uncertain submission recovery:** before sending, a per-user `sessionStorage` marker records only the project, never form fields. Storage failure blocks the request. Navigation/reload retains the guard, with reload conservatively treating an unresolved send as uncertain. Network/server failures or malformed successful responses may follow a committed order and never trigger a retry. Another send stays blocked until the user consults orders (a same-origin tab can inherit the session) and explicitly selects **Conferi a lista; liberar novo envio**; a fresh successful list read is required to release the marker. This cannot prove absence or supply server idempotency. Two accepted identical sends still create distinct POs ([ADR-009](../decisions/ADR-009-http-api-contract.md)). Definite validation/access/conflict failures permit correction and reference refresh without replacing fields.

## Purchase-order detail and decisions

`/purchase-orders/:id` groups identity, supplier/date, status, CoA version and authoritative total, with items/notes and immutable approval history. Desktop uses item/history columns; narrow layouts stack decision context and item cards. Seed-only trailing note markers are hidden without rewriting historical notes.

Approval and rejection buttons remain visible but disabled on terminal orders, with completed/rejected explanations. Non-assigned pending viewers see the current approver explanation and disabled actions. The client submits the displayed expected step, never an actor ID. Only the backend authorizes the current active assigned member; ADMIN cannot bypass sequence. Approval requires review; rejection requires a nonblank reason validated before submit.

Successful decisions replace detail with the server's full response; no optimistic step advance occurs. `409` prompts an authoritative read and conflict explanation. An uncertain result blocks more decisions until an explicit validated refresh. Synchronous guards prevent duplicate clicks, rejection text survives failures/refresh, and no decision is automatically retried.

## Project administration and CoA publication

`/admin/projects` lists projects and creates them in a dialog, then opens `/admin/projects/:id`. Each card gets `membership.count`, `activeCount` and `isMember` from **one `GET /projects` read**; there are no per-card membership requests/retries. Counts include inactive members separately from active accounts. The list loads/fails/refreshes as one unit. Name/CoA/activity filters live in the URL; active is the default. Favorites reorder matching cards locally, scoped by user in `localStorage` with cross-tab synchronization and unavailable-storage feedback; they never reach the API.

Detail supports active-only rename and confirmed archive/reactivation on the same project ID. Pending orders block archiving. Archived projects retain member/CoA/history consultation with configuration disabled; reactivation restores eligibility without rewriting history. Lifecycle actions stay unavailable during member management or CoA editing/publication. Drafts survive failed rename/reconciliation reads; uncertain writes require an explicit authoritative refresh before another save.

**Membership:** a compact avatar/name summary opens a searchable dialog. Active nonmembers can be added; saved members and candidate lookup load independently so a directory failure cannot hide CoA. Membership writes apply immediately, separately from CoA publication. Removal has row-level confirmation and server blockers for current CoA assignments/undecided pending-order steps. Blockers explain the ordinary resolution and preserve historical records. Pending writes block dismissal/repeats; uncertain results require read reconciliation, never success animation or write replay. Membership refreshes preserve an open CoA draft.

**Published CoA:** reusable `CoaView` displays exact ranges, introduced approvers, cumulative prefixes and version. Hover/focus/tap explains range bounds and the full prefix; tooltips are keyboard-dismissible. A local simulator tests amounts without publishing or creating an order. No configuration shows an empty state; the final unlimited segment is never a monetary ceiling.

**Local editor:** Edit uses active member UUIDs, each once. Add/remove/reorder changes the local ladder, with at least one approver retained. N approvers have N−1 neighbor-constrained thresholds with one-cent spacing. BigInt cents preserve exact bounds, including values above JavaScript's safe-integer range. Pointer/touch/keyboard controls and animated identity swaps respect reduced motion. Inactive/missing assignments remain visible for explicit correction and cannot be published.

Click/Enter/Space on an amount opens a bounded, focus-managed exact-input dialog. **Confirmar** applies only to the draft; **Fechar**, Escape/outside dismissal discard unconfirmed input. Blur never applies. Errors remain associated with the amount. The automatic visual scale starts at the greater of R$ 50.000 and 125% of the highest finite threshold, expands on right-edge holding and contracts with the last marker pinned at the midpoint on leftward holding. Neighbor/domain bounds still apply; scale never caps persisted amounts or enters the API payload. Keyboard slider percentages are a visual projection; `aria-valuetext` announces exact reais and the amount dialog preserves every cent.

**Explicit publication:** **Publicar alçada** reviews the complete proposed ladder/version and effect on new orders; **Publicar versão N** sends `{ expectedCoaVersion, bands }` with final `upperLimit: null` through `PUT /projects/:id/coa`. No control, member refresh or scale adjustment autosaves. Unchanged drafts cannot open review; backend matching-version identical writes remain no-ops. Confirmed responses supply the normalized saved ladder/version and return to view mode.

On `409 COA_VERSION_CONFLICT` or an uncertain failure, retain the draft and read current configuration separately. The admin explicitly discards or retains/rebases it on the displayed version, then must publish again. Failed reads leave edits intact. Changed/uncertain cancellation requires confirmation and successful authoritative read before discarding. Pending publication locks controls/repeat sends. Existing PO snapshots and complete revisions stay immutable; history is available through the ADMIN revisions API and audit explorer, without restoration/history mutation.

## Users and suppliers

`/admin/users` and `/admin/suppliers` use semantic directory cards, local search/status filtering and creation dialogs. User creation always provisions ordinary users; no role selector/promotion, user editing, forced deactivation or user/supplier reactivation exists. Masked initial passwords stay in ephemeral form state and clear after success, explicit clearing or leaving; they never enter storage, list state or success messages. Duplicate usernames and shared-schema/backend field errors appear inline.

Active suppliers support rename; inactive/missing records and archived projects cannot be renamed. Supplier rename fields/errors/uncertain state survive dismissal while mounted; conflicts/uncertain results require explicit authoritative refresh before saving again. Historical rename records keep old/new names, actor and time. Suppliers default to active; explicit all/inactive filters and audit source links reveal retained historical records. Users keep their own default.

Deactivation confirms consequences/history preservation. ADMIN cannot be deactivated. User blockers explain active-CoA replacement or pending approval resolution with relevant links, never overrides. Supplier deactivation prevents future selection without altering existing orders. Only confirmed success updates status; uncertain deletes are read back, and already inactive records require no repeated write. Create uncertainty retains fields, refreshes the list and blocks another send until explicit acknowledgment/clearing. Reads retry without discarding drafts; failed deactivation requires successful authoritative refresh before another attempt.

## Read-only audit

`/admin/audit` reads ADMIN-only `GET /audit/events`, with URL type/project/date/page filters, server count/pagination and a newest-first semantic event list. It includes PO creation/decisions, complete CoA revisions, user lifecycle, project creation/rename/archive/reactivation/member changes and supplier creation/deactivation/rename. Project filtering excludes global user events. Legacy actor metadata is shown as unknown rather than reconstructed.

The period selector uses local calendar days with inclusive lower/exclusive next-midnight timestamps. Construct each midnight independently across DST rather than adding 24 hours. Invalid/reversed drafts request nothing; URL timestamps restore the applied range, and external upper bounds display the last included instant. Type/project/page-size context survives period changes.

Rows open a read-only right-side Base UI drawer, full width on narrow screens, with actor/time/source links and historical details: full ladders, assignments, decimal-string totals, reasons and lifecycle snapshots. IDs remain in a technical-reference disclosure. It scrolls internally, traps/restores focus, dismisses with Escape/outside interaction and respects reduced motion. No event can be edited/deleted. Application-level history does not promise database tamper-proof storage. See [audit source boundaries](../api.md#read-only-audit-explorer-admin).

## Notifications and local persistence

The shell composes authenticated same-origin WebSocket-only Socket.IO with `features/notifications`. `po.action_required` produces an info toast; `po.finalized` produces success/warning. Runtime validation checks IDs, counters/status and deterministic event identity. Duplicate retained events do not replay inbox entries/toasts; restored entries are silent. Callbacks/actions are token-scoped and discarded on logout/persona changes.

**Notificações** in the account menu opens a right-side drawer. Avatar badges count retained entries (up to `9+`), without read/unread state. Entries group by local day, filter by decisions/results, dismiss individually or clear together. Opening order detail dismisses its retained entries; opening a new hint for an already displayed order also refreshes REST detail. Closing a toast only hides the toast. Hints can be stale and never enable approval, edit CoA or replace displayed orders optimistically.

The latest 100 entries and dismissed IDs live under `obraflow.notifications.<userId>` in versioned `localStorage`: minimal IDs/counters/status/receipt times, without tokens, credentials, amounts, names or notes. Empty/corrupt storage gets a non-event welcome entry; malformed entries are ignored. Storage events merge entries/dismissals silently; unavailable storage keeps a session-only inbox with feedback.

This is browser-local convenience, not durable delivery or cross-device synchronization. Disconnected users can miss events and storage can be cleared. There is no server inbox, replay, acknowledgement or polling. Recipient checks and REST/PostgreSQL remain authoritative ([ADR-011](../decisions/ADR-011-best-effort-realtime-po-notifications.md), [backend details](realtime.md)).

## Feedback surfaces

1. Field-specific feedback belongs beside the input, associated through accessible descriptions.
2. Persistent conditions/recovery use `AlertCard` or full-view `StateCard`: errors for failures, warning for conflicts/prerequisites/uncertainty, info for guidance/pending work.
3. Confirmed completed actions or live hints use session-scoped toasts; lasting state remains in the page/history. Toasts never carry the only recovery path.

Background refresh failures may toast while mounted data remains. Repeated-action member dialogs use an announced inline status. Views expose loading, populated, empty and retryable-error states; empty filters differ from missing prerequisites. No success card establishes financial state. The authenticated render boundary preserves navigation/account access, shows generic recovery and never exposes exception details or retries writes.

## Components, responsive layout and themes

Shared shadcn **Base UI** components are locally owned; Tailwind v4 handles layout/simple presentation and CSS Modules handle complex visuals/animations. Semantic tokens supply light/dark surfaces, workflow states and Inter typography. Light/Dark/System are the only theme modes; preference lives separately in `localStorage`, bootstrap resolves it early, and System follows OS changes. Labels/icons accompany status colors. No Radix alternative foundation, global state/cache or form-state framework is introduced.

`ListShell` arranges page-owned headers/notices/filters, list regions and optional pagination. At widths ≥900px and heights ≥600px only the named keyboard-focusable list region scrolls; order headers remain sticky. Phones/short windows scroll the page normally. Pagination is below orders/audit; catalogs remain unpaginated. Narrow page headers retain accessible 44px icon actions. Catalog search stays visible beside a filter toggle; audit uses its own filter toggle; orders keep compact project/view selectors.

Controlled selectors/date/calendar/money controls own presentation and keyboard behavior, while pages own validation, timestamps and API recovery. Preserve visible focus, forced-color support, modal focus restoration, constrained overlays and reduced motion. See the [UI guide](../../apps/web/src/components/ui/README.md) and [visual conventions](../brand/README.md).

Administrative creation uses `mode=create`, members `dialog=members`, deactivation `deactivate=<id>` and audit details `event=<source-qualified-id>`. Browser Back/Forward restores surfaces, not form contents. Closing removes only relevant parameters. Drafts/passwords/errors never enter URLs, and same-route query navigation cannot dismiss pending administrative writes. Audit excludes UI-only parameters from API queries. PO creation has its own route and submission recovery boundary described above.

## Verification

Use [submission acceptance](../submission-checklist.md) for current commands. `npm run build` checks web sources; CI separately type-checks browser/API test sources. `npm test` runs the quick tier (API, `unit` for pure front-end modules, and `e2e` UI-only acceptance), `npm test -- web` runs browser regressions and `npm test -- all` runs everything, through disposable real PostgreSQL orchestration. Test servers use 4100/5174; development stays on 4000/5173. Install Chromium with `npx playwright install chromium`.

Coverage includes auth/authorization, sequential/terminal decisions, exact money, draft/conflict/uncertain-write recovery, stale reads, lifecycle/history, notification isolation and accessible desktop/mobile interactions. Test coverage and historical runs do not establish a pass for a later candidate or screen-reader interoperability. Reviewer screenshots required by the original challenge belong in the final README; temporary captures/traces remain diagnostics, not submission evidence. This documentation cleanup does not run application suites or capture screenshots.
