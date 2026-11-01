import { confirmSave } from "../support/save-confirmation";
import { addMember } from "../support/members";
import { openCreation } from "../support/creation-dialog";
import { selectOption } from "../support/select";
import { appearance, closeAccount } from "../support/account";
import { test, expect, type Page } from "@playwright/test";

const resources = { users: [] as string[], suppliers: [] as string[], projects: [] as string[] };
const password = "acceptance-local-2026";
const suffix = crypto.randomUUID().slice(0, 8);
const people = [
  { username: `lia.${suffix}`, name: "Lia Compras" },
  { username: `rafael.${suffix}`, name: "Rafael Engenharia" },
];
async function create(page: Page, kind: "users" | "suppliers" | "projects", button: string) {
  const result = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().endsWith(`/${kind}`),
  );
  await page.getByRole("button", { name: button, exact: true }).click();

  const response = await result;
  expect(response.status()).toBe(201);
  const record = await response.json();
  resources[kind].push(record.id);
  return record as { id: string; name?: string; displayName?: string };
}
async function login(page: Page, username: string, secret: string) {
  await page.goto("/login");
  await page.getByLabel("Usuário", { exact: true }).fill(username);
  await page.getByLabel("Senha", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pedidos de compra", exact: true })).toBeVisible();
}
test.afterAll(async () => {
  const { dataSource } = await import("../../../api/src/db/data-source");
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      for (const id of resources.projects) {
        await manager.query(
          "DELETE FROM approval_decisions WHERE step_id IN (SELECT id FROM purchase_order_steps WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1))",
          [id],
        );
        await manager.query(
          "DELETE FROM purchase_order_steps WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1)",
          [id],
        );
        await manager.query(
          "DELETE FROM purchase_order_items WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1)",
          [id],
        );
        await manager.query("DELETE FROM purchase_orders WHERE project_id=$1", [id]);
        await manager.query("DELETE FROM coa_bands WHERE project_id=$1", [id]);
        await manager.query("DELETE FROM coa_revisions WHERE project_id=$1", [id]);
        await manager.query("DELETE FROM project_members WHERE project_id=$1", [id]);
        await manager.query("DELETE FROM project_lifecycle_events WHERE project_id=$1", [id]);
        await manager.query("DELETE FROM projects WHERE id=$1", [id]);
      }
      for (const id of resources.suppliers) await manager.query("DELETE FROM suppliers WHERE id=$1", [id]);
      for (const id of resources.users) {
        await manager.query("DELETE FROM user_lifecycle_events WHERE target_user_id=$1", [id]);
        await manager.query("DELETE FROM users WHERE id=$1", [id]);
      }
    });
  } finally {
    await dataSource.destroy();
  }
});

test("reviewer completes setup, member creation, sequential approval/rejection and audit review entirely through UI", async ({
  page,
  browser,
}) => {
  // Optional external avatars must not make acceptance or screenshot capture depend on an image service.
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  // 1a. The landing page and the demo personas.
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Explore o fluxo de aprovação" }).click();
  await expect(page.getByRole("heading", { name: "Escolha uma persona" })).toBeVisible();
  await page.getByRole("button", { name: "Entrar com usuário e senha" }).click();
  await login(page, "admin", process.env.SEED_ADMIN_PASSWORD ?? "demo-admin-2026");
  // 1b. As admin, provision two users.
  await page.getByRole("link", { name: "Usuários", exact: true }).click();
  for (const person of people) {
    await openCreation(page, "users");
    await page.getByLabel("Nome de exibição", { exact: true }).fill(person.name);
    await page.getByLabel("Usuário", { exact: true }).fill(person.username);
    await page.getByLabel("Senha inicial", { exact: true }).fill(password);
    await create(page, "users", "Criar usuário");
    await expect(page.getByLabel("Senha inicial", { exact: true })).toHaveCount(0);
  }
  // 2a. A supplier.
  await page.getByRole("link", { name: "Fornecedores", exact: true }).click();
  await openCreation(page, "suppliers");
  await page.getByLabel("Nome do fornecedor").fill("Materiais Horizonte");
  const supplier = await create(page, "suppliers", "Criar fornecedor");
  await expect(
    page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Materiais Horizonte", exact: true }) }),
  ).toContainText("Ativo");
  // 2b. A project with members and a complete approval ladder.
  await page.getByRole("link", { name: "Obras", exact: true }).click();
  await openCreation(page, "projects");
  await page.getByLabel("Nome da obra").fill("Obra Vista Verde");
  const project = await create(page, "projects", "Criar obra");
  await expect(page.getByRole("heading", { name: "Obra Vista Verde", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  for (let index = 0; index < people.length; index++) {
    await addMember(page, resources.users[index]);
    await expect(page.getByRole("list", { name: "Membros da obra" })).toContainText(people[index].name);
    await expect(page.getByRole("button", { name: "Atualizar membros", exact: true })).toBeEnabled();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await selectOption(page.getByLabel("Aprovador do nível 1", { exact: true }), resources.users[0]);
  await page.getByRole("button", { name: "Adicionar nível" }).click();
  await selectOption(page.getByLabel("Aprovador do nível 2", { exact: true }), resources.users[1]);
  await page.getByRole("button", { name: `Editar limite após ${people[0].name}`, exact: false }).click();
  const limit = page.getByRole("textbox", { name: `Limite após ${people[0].name} (R$)`, exact: true });
  await limit.fill("10000.00");
  await limit.press("Enter");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByTestId("coa-view").getByText("Versão: 1", { exact: true })).toBeVisible();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Alçada publicada" })).toContainText("Versão 1.");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  // Complete revision snapshots are reviewed below through the audit explorer.
  await page.getByRole("link", { name: "Voltar às obras", exact: true }).click();
  await expect(page.getByRole("list", { name: "Obras cadastradas" })).toContainText("Obra Vista Verde");
  // 3. Two members, in separate browser sessions: the first approves, the second must wait, then approves or rejects.
  const contexts = [await browser.newContext(), await browser.newContext()];
  try {
    for (const context of contexts) await context.route("https://i.pravatar.cc/**", (route) => route.abort());
    const creator = await contexts[0].newPage(),
      next = await contexts[1].newPage();
    await login(creator, people[0].username, password);
    await login(next, people[1].username, password);
    await creator.goto("/admin/audit");
    await expect(creator.getByRole("alert")).toContainText("Você não tem permissão");
    for (const outcome of ["APPROVED", "REJECTED"] as const) {
      await creator.goto("/purchase-orders");
      await creator.getByRole("button", { name: "Novo pedido", exact: true }).click();
      await expect(creator.getByRole("heading", { name: "Novo pedido", exact: true })).toBeVisible();
      await selectOption(
        creator.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Obra", { exact: true }),
        project.id,
      );
      await selectOption(
        creator.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Fornecedor", { exact: true }),
        supplier.id,
      );
      await creator
        .getByLabel("Descrição", { exact: true })
        .fill(outcome === "APPROVED" ? "Concreto para a fundação" : "Aço para revisão de orçamento");
      await creator.getByLabel("Quantidade", { exact: true }).fill("5");
      await creator.getByLabel("Unidade", { exact: true }).fill("m³");
      await creator.getByLabel("Preço unitário (R$)", { exact: true }).fill("2500.01");
      await creator
        .getByRole("form", { name: "Novo pedido", exact: true })
        .getByRole("button", { name: "Cadastrar pedido", exact: true })
        .click();
      await confirmSave(creator);
      await expect(creator.getByRole("heading", { name: /Pedido #/ })).toBeVisible();
      const orderPath = new URL(creator.url()).pathname;
      await next.goto(orderPath);
      await expect(next.getByRole("button", { name: "Aprovar", exact: true })).toBeDisabled();
      if (outcome === "APPROVED") {
        await creator.setViewportSize({ width: 390, height: 844 });
        await creator.getByRole("button", { name: "Abrir navegação" }).click();
        await expect(creator.getByRole("dialog")).toBeVisible();
        await creator.keyboard.press("Escape");
        await creator.setViewportSize({ width: 1280, height: 900 });
      }
      await creator.getByRole("button", { name: "Aprovar", exact: true }).click();
      await confirmSave(creator);
      await expect(creator.locator("[data-sonner-toast]").filter({ hasText: "Aprovação registrada" })).toBeVisible();
      await next.getByRole("button", { name: "Atualizar", exact: true }).click();
      await expect(next.getByRole("button", { name: "Aprovar", exact: true })).toBeEnabled();
      if (outcome === "APPROVED") {
        await next.getByRole("button", { name: "Aprovar", exact: true }).click();
        await confirmSave(next);
        await expect(next.getByText("Todas as etapas foram aprovadas. Este pedido está concluído.")).toBeVisible();
      } else {
        await next.getByRole("button", { name: "Rejeitar", exact: true }).click();
        await next.getByLabel("Motivo da rejeição").fill("Revisar a cotação de aço antes de uma nova compra.");
        await next.getByRole("button", { name: "Confirmar rejeição" }).click();
        await expect(next.getByRole("dialog")).not.toBeVisible();
        await expect(
          next.getByText("Revisar a cotação de aço antes de uma nova compra.", { exact: false }),
        ).toBeVisible();
      }
    }
    // 4. Both outcomes are visible in the order list, as a table and as mobile cards.
    await page.goto(`/purchase-orders?projectId=${project.id}`);
    const orders = page.getByRole("region", { name: "Tabela de pedidos" });
    await expect(orders).toContainText("Aprovado");
    await expect(orders).toContainText("Rejeitado");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("article")).toHaveCount(2);
    await page.setViewportSize({ width: 1280, height: 900 });
    // 5. The audit explorer lists the decisions and the complete CoA revisions.
    await page.goto(`/admin/audit?projectId=${project.id}`);
    await expect(page.getByRole("navigation", { name: "Paginação da auditoria" })).toContainText("10 eventos");
    const audit = page.getByRole("region", { name: "Histórico de auditoria" });
    await expect(audit.getByRole("article").filter({ hasText: "Obra criada" })).toHaveCount(1);
    await expect(audit.getByRole("article").filter({ hasText: "Membro adicionado" })).toHaveCount(people.length);
    const revision = audit.getByRole("article").filter({ hasText: "Alçada publicada" });
    await revision.getByText("Ver detalhes", { exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Lia Compras → Rafael Engenharia");
    await page.getByRole("button", { name: "Fechar detalhes" }).click();
    await appearance(page, "Escuro");
    await closeAccount(page);
    await expect(page.locator("html")).toHaveClass(/dark/);
    await appearance(page, "Claro");
    await closeAccount(page);
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await selectOption(page.getByLabel("Tipo de evento"), "STEP_REJECTED");
    await expect(page.getByRole("navigation", { name: "Paginação da auditoria" })).toContainText(
      "1–1 de 1 evento · Página 1 de 1",
    );
    await expect(audit.getByRole("article").filter({ hasText: "Etapa rejeitada" })).toHaveCount(1);
    await page.setViewportSize({ width: 390, height: 844 });
    const rejectedEvent = page.getByRole("article").filter({ hasText: "Etapa rejeitada" });
    await expect(page.getByRole("article")).toHaveCount(1);
    await rejectedEvent.getByText("Ver detalhes", { exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Revisar a cotação de aço");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Fechar detalhes" }).click();
    await page.setViewportSize({ width: 1280, height: 900 });
    // 6. The user lifecycle events are in the history too.
    await page.goto("/admin/audit?eventType=USER_CREATED");
    await expect(page.getByRole("region", { name: "Histórico de auditoria" })).toContainText(people[0].name);
    await expect(page.getByRole("region", { name: "Histórico de auditoria" })).toContainText(people[1].name);
  } finally {
    for (const context of contexts) await context.close();
  }
});
