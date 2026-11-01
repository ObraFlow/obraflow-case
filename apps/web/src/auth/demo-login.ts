import { DEMO_PASSWORDS, type DemoPersona } from "@dokimos/shared";

/** What a demo account can see: the projects it belongs to, or all of them. */
export const personaScope = (persona: DemoPersona) =>
  persona.role === "ADMIN" ? "Todas as obras" : persona.projects.join(" e ");

// These are public, disposable demo defaults, not a token-minting shortcut.
export function demoPassword(persona: DemoPersona) {
  return DEMO_PASSWORDS[persona.role];
}
