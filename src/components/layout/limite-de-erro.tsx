"use client";

import { Component, type ReactNode } from "react";

/**
 * Error boundary mínimo para pedaços do header que leem banco (seletor e contador).
 * Sem ele, uma falha do banco derrubaria o layout inteiro, inclusive a navegação,
 * e o usuário perderia o botão "Tentar novamente" da página. React só oferece
 * error boundary como class component.
 */
export class LimiteDeErro extends Component<
  { fallback: ReactNode; children: ReactNode },
  { falhou: boolean }
> {
  state = { falhou: false };

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidCatch(erro: unknown) {
    console.error("[header] falha ao carregar:", erro);
  }

  render() {
    return this.state.falhou ? this.props.fallback : this.props.children;
  }
}
