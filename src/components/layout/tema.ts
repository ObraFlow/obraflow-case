"use client";

import { useSyncExternalStore } from "react";

/**
 * Preferência de tema: "light", "dark" ou "sistema" (segue `prefers-color-scheme`).
 * Fica no localStorage, chave "obraflow:tema"; o atributo `data-theme` do <html> é o que o
 * CSS lê (globals.css). O script inline em app/layout.tsx aplica o atributo antes do
 * primeiro paint; este módulo cuida do resto: ler, gravar e avisar quem está na tela.
 *
 * Sem dependência externa de propósito: são três funções e um `useSyncExternalStore`.
 */

export type PreferenciaTema = "light" | "dark" | "sistema";
export type TemaResolvido = "light" | "dark";

const CHAVE = "obraflow:tema";
/** Disparado em `window` quando a preferência muda nesta aba. */
const EVENTO = "obraflow:tema";
const CONSULTA_SISTEMA = "(prefers-color-scheme: dark)";

export function lerPreferencia(): PreferenciaTema {
  try {
    const valor = window.localStorage.getItem(CHAVE);
    return valor === "light" || valor === "dark" ? valor : "sistema";
  } catch {
    // localStorage bloqueado (modo privado, política do site): vale o sistema.
    return "sistema";
  }
}

/** O que está valendo na tela agora, já resolvido o "sistema". */
export function lerTemaResolvido(): TemaResolvido {
  const preferencia = lerPreferencia();
  if (preferencia !== "sistema") return preferencia;
  return window.matchMedia(CONSULTA_SISTEMA).matches ? "dark" : "light";
}

function aplicarAtributo(preferencia: PreferenciaTema) {
  const html = document.documentElement;
  if (preferencia === "sistema") html.removeAttribute("data-theme");
  else html.setAttribute("data-theme", preferencia);
}

/** Grava a escolha e aplica na hora. "sistema" apaga a chave e o atributo. */
export function gravarPreferencia(preferencia: PreferenciaTema) {
  aplicarAtributo(preferencia);
  try {
    if (preferencia === "sistema") window.localStorage.removeItem(CHAVE);
    else window.localStorage.setItem(CHAVE, preferencia);
  } catch {
    // Sem localStorage a escolha vale até recarregar a página; não é erro para o usuário.
  }
  window.dispatchEvent(new CustomEvent(EVENTO));
}

/**
 * Avisa quando a preferência muda: nesta aba (evento próprio), em outra aba (`storage`,
 * e aí o atributo do <html> desta aba é atualizado também) ou no sistema (`matchMedia`).
 */
export function assinar(aoMudar: () => void): () => void {
  const sistema = window.matchMedia(CONSULTA_SISTEMA);
  const aoMudarStorage = (evento: StorageEvent) => {
    if (evento.key !== null && evento.key !== CHAVE) return;
    aplicarAtributo(lerPreferencia());
    aoMudar();
  };
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudarStorage);
  sistema.addEventListener("change", aoMudar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudarStorage);
    sistema.removeEventListener("change", aoMudar);
  };
}

// No servidor (e na hidratação) o snapshot é fixo: a tela sai igual nos dois lados e o
// valor real entra logo depois, sem erro de hidratação.
const servidorPreferencia = (): PreferenciaTema => "sistema";
const servidorResolvido = (): TemaResolvido => "light";

/** Preferência escolhida ("light" | "dark" | "sistema"). */
export function useTema(): PreferenciaTema {
  return useSyncExternalStore(assinar, lerPreferencia, servidorPreferencia);
}

/** Tema em vigor ("light" | "dark"), para quem precisa do valor final (ex.: o toaster). */
export function useTemaResolvido(): TemaResolvido {
  return useSyncExternalStore(assinar, lerTemaResolvido, servidorResolvido);
}
