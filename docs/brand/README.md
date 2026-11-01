# Visual identity and UI conventions

The product is **Dokimos**, with **by ObraFlow** as secondary attribution. The icon in `apps/web/public/brand/dokimos-icon.svg`, with its favicon and touch-icon exports beside it, is an AI-generated placeholder made quickly so the application feels complete. The challenge supplied no brand assets, and these are not ObraFlow's identity. Replacing them means swapping the files in that folder; nothing else depends on their artwork. `Brand.tsx` renders the shared lockup.

`apps/web/src/styles.css` owns the light/dark semantic tokens and typography. Components use those tokens through Tailwind aliases or adjacent CSS Modules. Inter Variable is bundled locally; its license ships in `apps/web/public/fonts/Inter-OFL.txt`.

- Graphite primary actions create or perform ordinary actions; copper actions save/publish; green approves; red rejects or deactivates. Outline and ghost actions remain neutral.
- Information uses blue; warnings, errors, workflow status and inactive records have separate semantic tokens. Labels and icons accompany color. See [feedback surfaces](../architecture/frontend.md#feedback-surfaces).
- Copper selection surfaces mark current navigation and selected options. Disabled controls and inactive historical records retain distinct appearances.
- CoA level colors identify ladder positions, never workflow status. Exact amounts and cumulative approver names remain available without relying on color.
- Focus, reduced motion, forced colors, contrast and responsive scrolling are covered by the browser regression suite.

See the [UI component guide](../../apps/web/src/components/ui/README.md) and the [frontend workflow guide](../architecture/frontend.md). Generated design galleries, candidate comparisons and historical verification manifests are not maintained in the repository. Test diagnostics belong in ignored Playwright output directories.
