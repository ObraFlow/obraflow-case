// Hook PostToolUse (Edit|Write): formata o arquivo recém-editado com Prettier
// e, se for TS/TSX, aplica eslint --fix. Falha silenciosa: nunca bloqueia a edição.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;

let filePath;
try {
  filePath = JSON.parse(input)?.tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!filePath || !existsSync(filePath)) process.exit(0);

// Só arquivos do projeto que o Prettier conhece; nada em node_modules ou gerados.
if (/node_modules|[\\/]\.next[\\/]|[\\/]src[\\/]generated[\\/]/.test(filePath)) process.exit(0);
if (!/\.(ts|tsx|mjs|mts|js|css|md|json|yml|yaml)$/.test(filePath)) process.exit(0);

// Barras normais: o Prettier trata "\" como escape de glob e não acha o arquivo no Windows.
const alvo = filePath.replace(/\\/g, "/");

// Chama os binários JS direto pelo Node: sem npx (lento) e sem shell (não precisa escapar).
const run = (bin, args) => spawnSync(process.execPath, [bin, ...args], { stdio: "ignore" });

if (/\.(ts|tsx|mjs|mts|js)$/.test(alvo)) run("node_modules/eslint/bin/eslint.js", ["--fix", alvo]);
run("node_modules/prettier/bin/prettier.cjs", ["--write", "--log-level", "silent", alvo]);
