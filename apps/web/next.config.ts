import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Imagem Docker: servidor autocontido só com os arquivos usados (em vez de todo o node_modules).
  // No monorepo pnpm as dependências ficam na raiz, então o rastreamento parte dela.
  ...(process.env.NEXT_OUTPUT === 'standalone' && {
    output: 'standalone',
    outputFileTracingRoot: path.join(__dirname, '../..'),
  }),
  // Padrões do Next 16: Cache Components + Partial Prefetching (ver CLAUDE.md, seção Front-end).
  cacheComponents: true,
  partialPrefetching: true,
  // Indicador do modo dev no canto direito (no esquerdo ele cobre o botão de tema da barra lateral);
  // desligado nos testes e2e para não aparecer nos screenshots.
  devIndicators: process.env.E2E ? false : { position: 'bottom-right' },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // A tela inicial é a lista de pedidos.
  async redirects() {
    return [{ source: '/', destination: '/pedidos', permanent: false }];
  },
};

export default nextConfig;
