/* global document -- referenced only inside callbacks that run in the browser page */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

// node scripts/screenshots.mjs [--url http://localhost:8080] [--out docs/assets/screenshots] [--only text]
//
// Captures the gallery of screens, dialogs and failure states under
//   <out>/<theme>/<viewport>/<area>/<NN>-<name>[--<persona>].png
// by driving a RUNNING app with the public demonstration accounts (start one with `npm run review`).
// It is a manual tool, not a test, and not an npm script. It reads and opens dialogs but never confirms a
// write, so the database is left as it was. Failure states are produced by intercepting requests in the
// browser, never by breaking the server. --only keeps the states whose path contains the text, for example
// `--only light/mobile/orders`; a full run replaces the theme folders under <out> and rewrites its manifest.md.
const args = process.argv.slice(2);
function option(name, fallback) {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
}
const base = option("url", "http://localhost:8080").replace(/\/$/, "");
const root = fileURLToPath(new URL("../", import.meta.url));
const out = resolve(root, option("out", "docs/assets/screenshots")).split("\\").join("/") + "/";
const only = option("only", "");

const themes = ["light", "dark"];
const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};
const passwords = { admin: "demo-admin-2026" };
const demoPassword = "demo-user-2026";

async function login(username) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password: passwords[username] ?? demoPassword }),
  });
  if (!response.ok) throw new Error(`Sign-in as ${username} failed (${response.status}). Is the demo data seeded?`);
  return (await response.json()).accessToken;
}

async function api(token, path) {
  const response = await fetch(`${base}/api/v1${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`GET ${path} failed (${response.status}).`);
  return response.json();
}

const apiError = (code, message) => ({ error: { code, message, details: [] } });

// --- helpers used by the states -------------------------------------------------------------------------

const button = (page, name) => page.getByRole("button", { name }).first();
const dialog = (page) => page.getByRole("dialog");

/** Makes every GET or write matching `pattern` answer with `status`, as if the server had failed. */
async function failRequests(page, pattern, status, body, method) {
  await page.route(pattern, (route) => {
    if (method && route.request().method() !== method) return route.continue();
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
}

/** Keeps matching requests pending forever, so the loading state stays on screen. */
async function holdRequests(page, pattern) {
  await page.route(pattern, () => {});
}

async function openAccount(page, viewport) {
  await button(page, viewport === "mobile" ? /^Abrir conta/ : /^Abrir painel da conta/).click();
}

async function openNavigation(page) {
  await button(page, /^Abrir navegação/).click();
}

/** The status filter is a row of buttons on a wide screen and a dropdown on a narrow one. */
async function chooseStatus(page, label) {
  const tab = button(page, new RegExp(`^${label}`));
  if (await tab.isVisible()) return tab.click();
  await page
    .getByRole("combobox")
    .filter({ hasText: /\(\d+\)/ })
    .click();
  await page.getByRole("option", { name: new RegExp(`^${label}`) }).click();
}

/** Narrow screens fold the filters behind a toggle. */
async function openFilters(page) {
  const toggle = button(page, /^Filtros/);
  if (await toggle.isVisible()) await toggle.click();
}

async function chooseOption(page, label, optionName) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: optionName }).first().click();
}

/** Fills the creation form with a valid order, so later states can stop at the review dialog. */
async function fillOrder(page) {
  await chooseOption(page, "Obra", "Residencial Vista Norte");
  await chooseOption(page, "Fornecedor", "Concretos Horizonte");
  await page.getByLabel("Data do pedido", { exact: true }).fill(new Date().toLocaleDateString("sv-SE"));
  await page.getByLabel("Descrição", { exact: true }).fill("Cimento CP-II 50 kg");
  await page.getByLabel("Quantidade", { exact: true }).fill("120");
  await page.getByLabel("Unidade", { exact: true }).fill("sc");
  await page.getByLabel("Preço unitário (R$)", { exact: true }).fill("38.50");
  await page.getByLabel("Preço unitário (R$)", { exact: true }).blur();
}

// --- the states -----------------------------------------------------------------------------------------
// as: the demonstration account to sign in as (null: signed out). only: restrict to one viewport.
// Order inside an area fixes its number, so the same state keeps its number in every tree.

function states(orders, projectId) {
  const lists = "/purchase-orders";
  return [
    // Signed out
    { area: "login", name: "login", as: null, path: "/login" },
    {
      area: "login",
      name: "wrong-password",
      as: null,
      path: "/login",
      run: async (page) => {
        await page.getByLabel("Usuário").fill("amanda");
        await page.getByLabel("Senha", { exact: true }).fill("senha-errada");
        await button(page, /^Entrar$/).click();
        await page
          .getByText(/inv[aá]lid|incorret/i)
          .first()
          .waitFor();
      },
    },
    {
      area: "login",
      name: "empty-submit",
      as: null,
      path: "/login",
      run: async (page) => {
        await button(page, /^Entrar$/).click();
        await page.locator(".field-error").first().waitFor();
      },
    },
    {
      area: "login",
      name: "demo-accounts",
      as: null,
      path: "/login",
      run: async (page) => {
        await button(page, /Explore o fluxo/).click();
        await page.getByRole("group", { name: "Personas de demonstração" }).waitFor();
      },
    },

    // Shell: navigation, account, notifications, theme
    { area: "shell", name: "sidebar", as: "admin", path: lists, only: "desktop" },
    {
      area: "shell",
      name: "sidebar-collapsed",
      as: "admin",
      path: lists,
      only: "desktop",
      run: async (page) => button(page, /^Recolher navegação/).click(),
    },
    {
      area: "shell",
      name: "navigation-drawer",
      as: "admin",
      path: lists,
      only: "mobile",
      run: async (page) => openNavigation(page),
    },
    {
      area: "shell",
      name: "account-panel",
      as: "amanda",
      path: lists,
      run: async (page, { viewport }) => openAccount(page, viewport),
    },
    {
      area: "shell",
      name: "switch-profile",
      as: "amanda",
      path: lists,
      run: async (page, { viewport }) => {
        await openAccount(page, viewport);
        await page
          .getByRole("button", { name: /Trocar perfil|Demonstra/ })
          .first()
          .click();
        await dialog(page).waitFor();
      },
    },
    {
      area: "shell",
      name: "notifications",
      as: "amanda",
      path: lists,
      run: async (page, { viewport }) => {
        await openAccount(page, viewport);
        await page
          .getByRole("button", { name: /Notifica/ })
          .first()
          .click();
        await dialog(page).waitFor();
      },
    },

    // Purchase orders: lists
    { area: "orders", name: "list", as: "amanda", path: lists },
    {
      area: "orders",
      name: "my-decision",
      as: "amanda",
      path: lists,
      run: async (page) => chooseStatus(page, "Sua decisão"),
    },
    {
      area: "orders",
      name: "approved",
      as: "amanda",
      path: lists,
      run: async (page) => chooseStatus(page, "Aprovados"),
    },
    {
      area: "orders",
      name: "rejected",
      as: "amanda",
      path: lists,
      run: async (page) => chooseStatus(page, "Rejeitados"),
    },
    {
      area: "orders",
      name: "nothing-to-decide",
      as: "admin",
      path: lists,
      run: async (page) => chooseStatus(page, "Sua decisão"),
    },
    {
      area: "orders",
      name: "project-filter",
      as: "amanda",
      path: lists,
      run: async (page) => page.getByRole("combobox", { name: "Obra" }).click(),
    },

    // Purchase orders: detail and decisions
    { area: "order-detail", name: "pending-my-turn", as: "amanda", path: () => `${lists}/${orders.pendingMine}` },
    { area: "order-detail", name: "pending-waiting", as: "amanda", path: () => `${lists}/${orders.pendingWaiting}` },
    { area: "order-detail", name: "approved", as: "amanda", path: () => `${lists}/${orders.approved}` },
    { area: "order-detail", name: "rejected", as: "amanda", path: () => `${lists}/${orders.rejected}` },
    { area: "order-detail", name: "admin-view", as: "admin", path: () => `${lists}/${orders.pendingMine}` },
    {
      area: "order-detail",
      name: "approve-confirmation",
      as: "amanda",
      path: () => `${lists}/${orders.pendingMine}`,
      run: async (page) => {
        await button(page, /^Aprovar/).click();
        await dialog(page).waitFor();
      },
    },
    {
      area: "order-detail",
      name: "reject-reason-required",
      as: "amanda",
      path: () => `${lists}/${orders.pendingMine}`,
      run: async (page) => {
        await button(page, /^Rejeitar/).click();
        await dialog(page).waitFor();
        await dialog(page).getByRole("button", { name: "Confirmar rejeição" }).click();
        await dialog(page).locator("[aria-invalid=true]").first().waitFor();
      },
    },
    {
      area: "order-detail",
      name: "decision-conflict",
      as: "amanda",
      path: () => `${lists}/${orders.pendingMine}`,
      intercept: (page) =>
        failRequests(
          page,
          /\/purchase-orders\/[^/]+\/decisions$/,
          409,
          apiError("CONFLICT", "O pedido já foi decidido."),
          "POST",
        ),
      run: async (page) => {
        await button(page, /^Aprovar/).click();
        await dialog(page)
          .getByRole("button", { name: /Aprovar|Confirmar/ })
          .last()
          .click();
        await page.getByRole("alert").first().waitFor();
      },
    },

    // Purchase orders: creation
    { area: "order-create", name: "empty-form", as: "amanda", path: `${lists}/new` },
    {
      area: "order-create",
      name: "field-errors",
      as: "amanda",
      path: `${lists}/new`,
      run: async (page) => {
        await button(page, /^Verificar campos/).click();
        await page.locator("[aria-invalid=true]").first().waitFor();
      },
    },
    {
      area: "order-create",
      name: "approval-estimate",
      as: "amanda",
      path: `${lists}/new`,
      run: async (page) => {
        await fillOrder(page);
        await page.getByText("Quem aprova este pedido").waitFor();
      },
    },
    {
      area: "order-create",
      name: "review",
      as: "amanda",
      path: `${lists}/new`,
      run: async (page) => {
        await fillOrder(page);
        await button(page, /^Cadastrar pedido/).click();
        await dialog(page).waitFor();
      },
    },
    {
      area: "order-create",
      name: "uncertain-result",
      as: "amanda",
      path: `${lists}/new`,
      intercept: (page) =>
        page.route(/\/purchase-orders$/, (route) =>
          route.request().method() === "POST"
            ? route.fulfill({ status: 201, contentType: "application/json", body: '{"unexpected":true}' })
            : route.continue(),
        ),
      run: async (page) => {
        await fillOrder(page);
        await button(page, /^Cadastrar pedido/).click();
        await dialog(page)
          .getByRole("button", { name: /Cadastrar pedido/ })
          .last()
          .click();
        await page
          .getByText(/confirm|incert|não foi poss/i)
          .first()
          .waitFor();
      },
    },

    // Projects and the CoA (alçada)
    { area: "projects", name: "list", as: "admin", path: "/admin/projects" },
    {
      area: "projects",
      name: "new-project",
      as: "admin",
      path: "/admin/projects",
      run: async (page) => {
        await button(page, /^Adicionar obra/).click();
        await dialog(page).waitFor();
      },
    },
    {
      area: "projects",
      name: "new-project-errors",
      as: "admin",
      path: "/admin/projects",
      run: async (page) => {
        await button(page, /^Adicionar obra/).click();
        await dialog(page).getByRole("button", { name: "Criar obra" }).click();
        await dialog(page).locator("[aria-invalid=true]").first().waitFor();
      },
    },
    { area: "project-detail", name: "overview", as: "admin", path: () => `/admin/projects/${projectId}` },
    {
      area: "project-detail",
      name: "rename",
      as: "admin",
      path: () => `/admin/projects/${projectId}`,
      run: async (page) => {
        await button(page, /^Renomear obra/).click();
        await dialog(page).waitFor();
      },
    },
    {
      area: "project-detail",
      name: "archive",
      as: "admin",
      path: () => `/admin/projects/${projectId}`,
      run: async (page) => {
        await button(page, /^Arquivar obra/).click();
        await dialog(page).waitFor();
      },
    },
    {
      area: "project-detail",
      name: "members",
      as: "admin",
      path: () => `/admin/projects/${projectId}`,
      run: async (page) => {
        await button(page, /^Gerenciar membros/).click();
        await dialog(page).waitFor();
      },
    },
    {
      area: "project-detail",
      name: "ladder-simulator",
      as: "admin",
      path: () => `/admin/projects/${projectId}`,
      run: async (page) => {
        await button(page, /^Testar um valor/).click();
        const field = page.getByLabel(/valor/i).first();
        await field.fill("25000");
        await page.waitForTimeout(600);
      },
    },
    {
      area: "project-detail",
      name: "ladder-versions",
      as: "admin",
      path: () => `/admin/projects/${projectId}`,
      run: async (page) => button(page, /^Versões da alçada/).click(),
    },
    {
      area: "project-detail",
      name: "ladder-editor",
      as: "admin",
      path: () => `/admin/projects/${projectId}`,
      run: async (page) => button(page, /^Editar$/).click(),
    },
    {
      area: "project-detail",
      name: "ladder-publish-conflict",
      as: "admin",
      path: () => `/admin/projects/${projectId}`,
      intercept: (page) =>
        failRequests(
          page,
          /\/projects\/[^/]+\/coa$/,
          409,
          apiError("CONFLICT", "A alçada mudou desde que você a abriu."),
          "PUT",
        ),
      run: async (page) => {
        await button(page, /^Editar$/).click();
        await button(page, /^Adicionar nível|^Adicionar/)
          .first()
          .click();
        await button(page, /^Publicar/).click();
        await dialog(page)
          .getByRole("button", { name: /Publicar/ })
          .last()
          .click();
        await page.getByRole("alert").first().waitFor();
      },
    },

    // Suppliers
    { area: "suppliers", name: "list", as: "admin", path: "/admin/suppliers" },
    {
      area: "suppliers",
      name: "new-supplier",
      as: "admin",
      path: "/admin/suppliers",
      run: async (page) => {
        await button(page, /^Adicionar fornecedor/).click();
        await dialog(page).waitFor();
      },
    },
    {
      area: "suppliers",
      name: "rename",
      as: "admin",
      path: "/admin/suppliers",
      run: async (page) => {
        await button(page, /^Renomear /).click();
        await dialog(page).waitFor();
      },
    },
    {
      area: "suppliers",
      name: "deactivate",
      as: "admin",
      path: "/admin/suppliers",
      run: async (page) => {
        await button(page, /^Desativar /).click();
        await dialog(page).waitFor();
      },
    },

    // Users
    { area: "users", name: "list", as: "admin", path: "/admin/users" },
    {
      area: "users",
      name: "new-user",
      as: "admin",
      path: "/admin/users",
      run: async (page) => {
        await button(page, /^Adicionar usuário/).click();
        await dialog(page).waitFor();
      },
    },
    {
      area: "users",
      name: "deactivate",
      as: "admin",
      path: "/admin/users",
      run: async (page) => {
        await button(page, /^Desativar /).click();
        await dialog(page).waitFor();
      },
    },

    // Audit
    { area: "audit", name: "list", as: "admin", path: "/admin/audit" },
    {
      area: "audit",
      name: "event-details",
      as: "admin",
      path: "/admin/audit",
      run: async (page) => {
        await button(page, /^Ver detalhes/).click();
        await dialog(page).waitFor();
      },
    },
    {
      area: "audit",
      name: "event-types",
      as: "admin",
      path: "/admin/audit",
      run: async (page) => {
        await openFilters(page);
        await page.getByRole("combobox", { name: "Tipo de evento" }).click();
      },
    },

    // Failure and edge states
    { area: "states", name: "not-found", as: "amanda", path: "/nao-existe" },
    { area: "states", name: "admin-not-found", as: "admin", path: "/admin/nao-existe" },
    { area: "states", name: "admin-only", as: "amanda", path: "/admin/projects" },
    { area: "states", name: "order-not-found", as: "amanda", path: `${lists}/00000000-0000-4000-8000-000000000000` },
    {
      area: "states",
      name: "list-loading",
      as: "amanda",
      path: lists,
      intercept: (page) => holdRequests(page, /\/purchase-orders\?/),
    },
    {
      area: "states",
      name: "list-failed",
      as: "amanda",
      path: lists,
      intercept: (page) =>
        failRequests(page, /\/purchase-orders\?/, 500, apiError("INTERNAL_ERROR", "Erro interno do servidor."), "GET"),
    },
    {
      area: "states",
      name: "detail-failed",
      as: "amanda",
      path: () => `${lists}/${orders.pendingMine}`,
      intercept: (page) =>
        failRequests(
          page,
          /\/purchase-orders\/[^/?]+$/,
          500,
          apiError("INTERNAL_ERROR", "Erro interno do servidor."),
          "GET",
        ),
    },
    {
      area: "states",
      name: "session-expired",
      as: "amanda",
      path: lists,
      intercept: (page) =>
        failRequests(page, /\/purchase-orders\?/, 401, apiError("UNAUTHORIZED", "Sessão expirada."), "GET"),
    },
  ];
}

// --- run ------------------------------------------------------------------------------------------------

const pad = (n) => String(n + 1).padStart(2, "0");

async function chooseOrders() {
  const amanda = await login("amanda");
  const all = (await api(amanda, "/purchase-orders?pageSize=100")).data;
  const mine = (await api(amanda, "/purchase-orders?pageSize=100&actionableByMe=true")).data;
  const mineIds = new Set(mine.map((order) => order.id));
  const pick = (rows, status) => rows.find((order) => order.status === status)?.id;
  return {
    pendingMine: mine[0]?.id,
    pendingWaiting: all.find((order) => order.status === "PENDING" && !mineIds.has(order.id))?.id,
    approved: pick(all, "APPROVED"),
    rejected: pick(all, "REJECTED"),
  };
}

const orders = await chooseOrders();
const admin = await login("admin");
const projectId = (await api(admin, "/projects")).data[0].id;
const tokens = { admin, amanda: await login("amanda") };

const all = states(orders, projectId);
const counters = new Map();
const numbered = all.map((state) => {
  const n = counters.get(state.area) ?? 0;
  counters.set(state.area, n + 1);
  return { ...state, file: `${pad(n)}-${state.name}${state.as ? `--${state.as}` : ""}.png` };
});

const appliesTo = (state, viewport) => !state.only || state.only === viewport;
const pathOf = (state, theme, viewport) => `${theme}/${viewport}/${state.area}/${state.file}`;

const jobs = [];
for (const theme of themes)
  for (const viewport of Object.keys(viewports))
    for (const state of numbered) {
      if (!appliesTo(state, viewport)) continue;
      const target = pathOf(state, theme, viewport);
      if (only && !target.includes(only)) continue;
      jobs.push({ theme, viewport, state, target });
    }

if (!only) for (const theme of themes) await rm(`${out}${theme}`, { recursive: true, force: true });

const browser = await chromium.launch();
const failed = [];
let written = 0;

for (const theme of themes) {
  for (const viewport of Object.keys(viewports)) {
    const mine = jobs.filter((job) => job.theme === theme && job.viewport === viewport);
    if (!mine.length) continue;
    const context = await browser.newContext({
      viewport: viewports[viewport],
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    context.setDefaultTimeout(6000);
    await context.addInitScript((mode) => {
      localStorage.setItem("obraflow.theme", mode);
      const style = document.createElement("style");
      style.textContent =
        "*{caret-color:transparent!important;animation-duration:0s!important;transition-duration:0s!important}";
      document.addEventListener("DOMContentLoaded", () => document.head.append(style));
    }, theme);

    for (const { state, target } of mine) {
      const page = await context.newPage();
      try {
        const path = typeof state.path === "function" ? state.path() : state.path;
        if (path.includes("undefined")) throw new Error("the demo data has no order for this state");
        if (state.as) {
          const token = tokens[state.as] ?? (tokens[state.as] = await login(state.as));
          await page.addInitScript((value) => sessionStorage.setItem("obraflow.accessToken", value), token);
        }
        await state.intercept?.(page);
        await page.goto(base + path);
        await page.waitForLoadState("networkidle").catch(() => {});
        await state.run?.(page, { viewport, theme });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(450);
        const file = `${out}${target}`;
        await mkdir(file.slice(0, file.lastIndexOf("/")), { recursive: true });
        // A page that scrolls as a whole is captured at its full height; dialogs and inner scroll regions stay
        // one screen. The viewport is grown instead of using fullPage so sticky bars stay where they belong.
        const height = await page.evaluate(() =>
          document.querySelector("[role=dialog]") ? 0 : document.documentElement.scrollHeight,
        );
        if (height > viewports[viewport].height + 4) {
          await page.setViewportSize({ width: viewports[viewport].width, height: Math.min(height, 6000) });
          await page.waitForTimeout(300);
        }
        await page.screenshot({ path: file });
        written += 1;
      } catch (error) {
        failed.push(`${target}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
      } finally {
        await page.close();
      }
    }
    await context.close();
  }
}
await browser.close();

/** One manifest row: a thumbnail of the first capture and a link to each theme and viewport of the state. */
function manifestRow(state) {
  const sizes = Object.keys(viewports).filter((viewport) => appliesTo(state, viewport));
  const links = themes.flatMap((theme) =>
    sizes.map((viewport) => `[${theme} ${viewport}](${pathOf(state, theme, viewport)})`),
  );
  const preview = pathOf(state, themes[0], sizes[0]);
  return `| <img src="${preview}" width="240" alt="${state.file}"> | \`${state.file}\` | ${links.join(" · ")} |`;
}

if (!only) {
  const lines = [
    "# Screenshots",
    "",
    "Generated by `node scripts/screenshots.mjs`; see that file for how and why.",
    "",
  ];
  const areas = [...new Set(numbered.map((state) => state.area))];
  for (const area of areas) {
    lines.push(`## ${area}`, "", "| Preview | State | Captures |", "| --- | --- | --- |");
    for (const state of numbered.filter((entry) => entry.area === area)) lines.push(manifestRow(state));
    lines.push("");
  }
  await mkdir(out, { recursive: true });
  await writeFile(`${out}manifest.md`, lines.join("\n"));
}

console.log(`${written} screenshots written to ${out}`);
if (failed.length) {
  console.error(`${failed.length} failed:\n  ${failed.join("\n  ")}`);
  process.exitCode = 1;
}
