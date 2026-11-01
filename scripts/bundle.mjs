import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

// npm run bundle   builds everything and assembles dist/, a deployable copy for a host without Docker:
//
//   dist/apps/api/dist       compiled API, migrations and seed
//   dist/apps/shared/dist    compiled shared contracts
//   dist/apps/web/dist       static frontend, served by nginx
//   dist/package*.json       lockfile and manifests for `npm ci --omit=dev` on the target host
//   dist/nginx.conf.template nginx site, rendered with envsubst
//   dist/.env.example        API settings
//
// Dependencies are not copied: argon2 is a native module, so they must be installed on the target.
// The Docker image (docker/Dockerfile) is the other deployable and does not use this folder.
const rootUrl = new URL("../", import.meta.url);
const dist = new URL("dist/", rootUrl);
const workspaces = ["api", "shared", "web"];

const build = spawnSync("npm run build", {
  cwd: fileURLToPath(rootUrl),
  stdio: "inherit",
  shell: true,
  windowsHide: true,
});
if (build.status !== 0) {
  console.error("Build failed; dist/ was not assembled.");
  process.exit(1);
}

function copy(from, to) {
  cpSync(new URL(from, rootUrl), new URL(to, dist), { recursive: true });
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
copy("package.json", "package.json");
copy("package-lock.json", "package-lock.json");
for (const name of workspaces) {
  copy(`apps/${name}/package.json`, `apps/${name}/package.json`);
  copy(`apps/${name}/dist`, `apps/${name}/dist`);
}
copy("docker/nginx.conf", "nginx.conf.template");
copy("docker/bundle.env.example", ".env.example");
copy("docker/bundle.md", "README.md");
console.log("dist/ is ready. See dist/README.md for installing and running it.");
