import { execSync } from 'node:child_process';

/** Antes de tudo: cria/migra o banco de teste e popula com o seed. */
export default function globalSetup() {
  execSync('pnpm exec tsx test/test-db.ts prepare', {
    cwd: '../api',
    stdio: 'inherit',
  });
}
