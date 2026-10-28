import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // A raiz não tem conteúdo próprio: a tela principal é a de aprovações.
  // Redirect na config, e não em app/page.tsx, para não disparar a validação
  // de prerender do Next 16 a cada acesso em dev.
  redirects() {
    return [{ source: "/", destination: "/aprovacoes", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
