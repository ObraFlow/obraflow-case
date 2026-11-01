import { test, expect, type Page } from "@playwright/test";
import { selectOption } from "../support/select";

const projects = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
const people = [
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
];
const supplier = "66666666-6666-4666-8666-666666666666";
const names = ["João", "Amanda", "Carlos"];

async function setup(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("obraflow.accessToken", "clarity-fixture"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await page.route("**/api/v1/**", (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    if (route.request().method() !== "GET") throw new Error("This presentation fixture must never write.");
    if (path.endsWith("/auth/me"))
      return route.fulfill({ json: { id: people[0], username: "joao", displayName: names[0], role: "ADMIN" } });
    if (path.endsWith("/projects"))
      return route.fulfill({
        json: {
          data: projects.map((id, index) => ({
            id,
            name: index ? "Centro Comercial Atlântico" : "Residencial Vista Norte",
            isActive: true,
            coaVersion: index + 1,
            membership: { count: 1, activeCount: 1, isMember: true },
          })),
        },
      });
    if (path.endsWith("/suppliers"))
      return route.fulfill({ json: { data: [{ id: supplier, name: "Concretos Horizonte", isActive: true }] } });
    if (path.endsWith("/members"))
      return route.fulfill({
        json: { data: people.map((userId, index) => ({ userId, displayName: names[index], isActive: true })) },
      });
    if (path.endsWith("/coa")) {
      const second = path.includes(projects[1]);
      return route.fulfill({
        json: {
          projectId: second ? projects[1] : projects[0],
          coaVersion: second ? 2 : 1,
          bands: second
            ? [{ approverId: people[2], upperLimit: null }]
            : [
                { approverId: people[0], upperLimit: "10000.00" },
                { approverId: people[1], upperLimit: null },
              ],
        },
      });
    }
    if (path.endsWith("/users"))
      return route.fulfill({
        json: {
          data: people.map((id, index) => ({
            id,
            username: names[index].toLowerCase(),
            displayName: names[index],
            role: index ? "USER" : "ADMIN",
            isActive: true,
          })),
        },
      });
    if (path.endsWith("/purchase-orders")) {
      const second = url.searchParams.get("projectId") === projects[1];
      const totals = second
        ? { all: 7, mine: 2, PENDING: 4, APPROVED: 2, REJECTED: 1 }
        : { all: 33, mine: 13, PENDING: 18, APPROVED: 10, REJECTED: 5 };
      const status = url.searchParams.get("status");
      const records = Array.from({ length: totals.all }, (_, index) => {
        const state =
          index < totals.PENDING ? "PENDING" : index < totals.PENDING + totals.APPROVED ? "APPROVED" : "REJECTED";
        const currentIndex = index < totals.mine ? 0 : 1;
        return {
          id: `${(index + 1).toString(16).padStart(8, "0")}-7777-4777-8777-777777777777`,
          projectId: projects[Number(second)],
          project: {
            id: projects[Number(second)],
            name: second ? "Centro Comercial Atlântico" : "Residencial Vista Norte",
          },
          supplier: { id: supplier, name: "Concretos Horizonte", isActive: true },
          orderDate: "2026-10-27",
          createdAt: "2026-10-27T12:00:00Z",
          coaVersion: 1,
          total: "12500.00",
          status: state,
          itemCount: 1,
          stepCount: 2,
          decidedStepCount: state === "APPROVED" ? 2 : state === "REJECTED" ? 1 : currentIndex,
          currentApproval:
            state === "PENDING"
              ? { approverId: people[currentIndex], approverName: names[currentIndex], stepIndex: currentIndex }
              : null,
          approvalSteps: people.slice(0, 2).map((approverId, stepIndex) => ({
            approverId,
            approverName: names[stepIndex],
            stepIndex,
            state:
              state === "APPROVED"
                ? "APPROVED"
                : state === "REJECTED"
                  ? stepIndex
                    ? "SKIPPED"
                    : "REJECTED"
                  : stepIndex < currentIndex
                    ? "APPROVED"
                    : stepIndex === currentIndex
                      ? "CURRENT"
                      : "UPCOMING",
          })),
        };
      }).filter(
        (order) =>
          (!status || order.status === status) &&
          (url.searchParams.get("actionableByMe") !== "true" || order.currentApproval?.approverId === people[0]),
      );
      const pageNumber = Number(url.searchParams.get("page") ?? 1),
        pageSize = Number(url.searchParams.get("pageSize") ?? 20);
      return route.fulfill({
        json: {
          data: records.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
          pagination: { page: pageNumber, pageSize, total: records.length },
          distribution: {
            total: totals.all,
            byStatus: { PENDING: totals.PENDING, APPROVED: totals.APPROVED, REJECTED: totals.REJECTED },
            actionableByMe: totals.mine,
          },
        },
      });
    }
    return route.fulfill({
      status: 404,
      json: { error: { code: "NOT_FOUND", message: "Fixture not configured", details: [] } },
    });
  });
}

for (const width of [390])
  for (const theme of ["light"] as const)
    test(`approval information remains visible and actionable at ${width}px/${theme}`, async ({ page }) => {
      await setup(page);
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/purchase-orders");
      const views = page.getByRole("navigation", { name: "Visões dos pedidos", exact: true });
      const compact = page.getByLabel("Visualização dos pedidos", { exact: true });
      if (width < 900) {
        await expect(compact).toContainText("Todos (33)");
        await compact.click();
        await expect(page.getByRole("option", { name: "Sua decisão (13)", exact: true })).toBeVisible();
        await page.keyboard.press("Escape");
      } else {
        await expect(views.getByRole("button", { name: /^Todos/ })).toHaveText("Todos33");
        await expect(views.getByRole("button", { name: /^Sua decisão/ })).toHaveText("Sua decisão13");
      }
      await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toHaveCount(0);
      if (width < 900) await selectOption(compact, "mine");
      else await views.getByRole("button", { name: /^Sua decisão/ }).click();
      await expect(page).toHaveURL(/actionableByMe=true/);
      if (width < 900) await selectOption(compact, "approved");
      else await views.getByRole("button", { name: /^Aprovados/ }).click();
      await expect(page).toHaveURL(/status=APPROVED/);
      await expect(page).not.toHaveURL(/actionableByMe/);
      await selectOption(page.getByLabel("Obra", { exact: true }), projects[1]);
      if (width < 900) await expect(compact).toContainText("Aprovados (2)");
      else await expect(views.getByRole("button", { name: /^Todos/ })).toHaveText("Todos7");
      await page.goto(`/admin/projects/${projects[0]}`);
      const saved = page.getByTestId("coa-view");
      const finalRange = saved.getByRole("list", { name: "Faixas e cadeias efetivas" }).getByRole("listitem").last();
      await expect(finalRange.getByRole("heading", { name: "Acima de R$ 10.000,00", exact: true })).toBeVisible();
      await expect(finalRange).toContainText("João → Amanda");
      await saved.getByText("Testar um valor", { exact: true }).click();
      const amount = saved.getByLabel("Valor para simular (R$)", { exact: true });
      await amount.fill("10000.00");
      await expect(saved.getByRole("status")).toContainText("1 aprovação necessária");
      await amount.fill("10000.01");
      await expect(saved.getByRole("status")).toContainText("2 aprovações necessárias");
      await amount.fill("9999999999999999.99");
      await expect(saved.getByRole("status")).toContainText("João → Amanda");
      await amount.fill("1,001");
      await expect(amount).toHaveAttribute("aria-invalid", "true");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.goto("/purchase-orders?mode=create");
      const form = page.getByRole("form", { name: "Novo pedido", exact: true });
      await selectOption(form.getByLabel("Obra", { exact: true }), projects[0]);
      await selectOption(form.getByLabel("Fornecedor", { exact: true }), supplier);
      await form.getByLabel("Descrição", { exact: true }).fill("Concreto usinado C30");
      await form.getByLabel("Quantidade", { exact: true }).fill("1");
      await form.getByLabel("Unidade", { exact: true }).fill("m³");
      await form.getByLabel("Preço unitário (R$)", { exact: true }).fill("12500.00");
      await expect(form.getByRole("list", { name: "Sequência prevista" }).getByRole("listitem")).toHaveCount(2);
      await form.getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
      const review = page.getByRole("dialog", { name: "Cadastrar pedido", exact: true });
      await expect(page.getByRole("dialog")).toHaveCount(1);
      await expect(review.getByRole("button", { name: "Editar pedido", exact: true })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(form).toBeVisible();
      await expect(form.getByLabel("Descrição", { exact: true })).toHaveValue("Concreto usinado C30");
      await expect(form.getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeFocused();
    });

test("project switching ignores a late preview and failed preview reads recover without losing items", async ({
  page,
}) => {
  await setup(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/projects/${projects[0]}/coa`, async (route) => {
    await held;
    await route
      .fulfill({
        json: { projectId: projects[0], coaVersion: 1, bands: [{ approverId: people[0], upperLimit: null }] },
      })
      .catch(() => {});
  });
  await page.goto("/purchase-orders?mode=create");
  const form = page.getByRole("form", { name: "Novo pedido", exact: true });
  try {
    await selectOption(form.getByLabel("Obra", { exact: true }), projects[0]);
    await selectOption(form.getByLabel("Obra", { exact: true }), projects[1]);
    await form.getByLabel("Quantidade", { exact: true }).fill("1");
    await form.getByLabel("Preço unitário (R$)", { exact: true }).fill("1");
    await expect(form.getByRole("region", { name: "Prévia da aprovação" })).toContainText("Alçada versão 2");
    release();
    await expect(form.getByRole("list", { name: "Sequência prevista" })).toContainText("Carlos");
    await expect(form.getByRole("list", { name: "Sequência prevista" })).not.toContainText("João");
  } finally {
    release();
  }
  await page.unroute(`**/projects/${projects[0]}/coa`);
  await page.route(
    `**/projects/${projects[0]}/coa`,
    (route) =>
      route.fulfill({
        status: 503,
        json: { error: { code: "UNAVAILABLE", message: "Consulta indisponível.", details: [] } },
      }),
    { times: 1 },
  );
  await form.getByLabel("Descrição", { exact: true }).fill("Rascunho preservado");
  await selectOption(form.getByLabel("Obra", { exact: true }), projects[0]);
  await expect(form.getByRole("region", { name: "Prévia da aprovação" })).toContainText("Não foi possível consultar");
  await form.getByRole("button", { name: "Atualizar prévia", exact: true }).click();
  await expect(form.getByRole("region", { name: "Prévia da aprovação" })).toContainText("Alçada versão 1");
  await expect(form.getByLabel("Descrição", { exact: true })).toHaveValue("Rascunho preservado");
});

test("the value tester handles zero, all exact boundaries and a single unlimited approver without writes", async ({
  page,
}) => {
  await setup(page);
  await page.route(`**/projects/${projects[0]}/coa`, (route) =>
    route.fulfill({
      json: {
        projectId: projects[0],
        coaVersion: 3,
        bands: [
          { approverId: people[0], upperLimit: "10000.00" },
          { approverId: people[1], upperLimit: "50000.00" },
          { approverId: people[2], upperLimit: null },
        ],
      },
    }),
  );
  await page.goto(`/admin/projects/${projects[0]}`);
  const view = page.getByTestId("coa-view");
  await view.getByText("Testar um valor", { exact: true }).click();
  for (const [value, count] of [
    ["0", 1],
    ["10000.00", 1],
    ["10000.01", 2],
    ["50000.00", 2],
    ["50000.01", 3],
    ["9999999999999999.99", 3],
  ] as const) {
    await view.getByLabel("Valor para simular (R$)", { exact: true }).fill(value);
    await expect(view.getByRole("status")).toContainText(
      `${count} ${count === 1 ? "aprovação necessária" : "aprovações necessárias"}`,
    );
  }
  await page.goto(`/admin/projects/${projects[1]}`);
  await view.getByText("Testar um valor", { exact: true }).click();
  await view.getByLabel("Valor para simular (R$)", { exact: true }).fill("0");
  await expect(view.getByRole("status")).toContainText("Sequência: Carlos");
  await expect(view.getByRole("list", { name: "Faixas e cadeias efetivas" })).toContainText("Qualquer valor");
  await expect(view.getByRole("slider")).toHaveCount(0);
});

test("view counts come from the list response and stay stable whichever view is selected", async ({ page }) => {
  await setup(page);
  const countReads: string[] = [];
  page.on("request", (request) => {
    const query = new URL(request.url()).searchParams;
    if (request.url().includes("/purchase-orders") && query.get("pageSize") === "1") countReads.push(request.url());
  });
  await page.goto("/purchase-orders?status=PENDING");
  const views = page.getByRole("navigation", { name: "Visões dos pedidos" });
  // Selecting a view narrows the list, never the other views' sizes.
  await expect(views.getByRole("button", { name: /^Pendentes/ })).toHaveText("Pendentes18");
  await expect(views.getByRole("button", { name: /^Todos/ })).toHaveText("Todos33");
  await expect(views.getByRole("button", { name: /^Aprovados/ })).toHaveText("Aprovados10");
  await expect(views.getByRole("button", { name: /^Rejeitados/ })).toHaveText("Rejeitados5");
  await expect(views.getByRole("button", { name: /^Sua decisão/ })).toHaveText("Sua decisão13");
  await views.getByRole("button", { name: /^Aprovados/ }).click();
  await expect(page).toHaveURL(/status=APPROVED/);
  await expect(views.getByRole("button", { name: /^Pendentes/ })).toHaveText("Pendentes18");
  expect(countReads).toEqual([]);
});

for (const width of [320])
  test(`compact order filters preserve both selections, pagination reset and history at ${width}px`, async ({
    page,
  }) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/purchase-orders?page=2");
    const bar = page.getByRole("region", { name: "Filtros de pedidos", exact: true });
    const project = bar.getByLabel("Obra", { exact: true });
    const view = bar.getByLabel("Visualização dos pedidos", { exact: true });
    await expect(view).toBeVisible();
    await selectOption(project, projects[1]);
    await expect(page).not.toHaveURL(/page=/);
    await selectOption(view, "mine");
    await expect(page).toHaveURL(/actionableByMe=true/);
    await expect(page).toHaveURL(new RegExp(`projectId=${projects[1]}`));
    await expect(view).toContainText("Sua decisão (2)");
    await selectOption(view, "approved");
    await expect(page).toHaveURL(/status=APPROVED/);
    await expect(page).not.toHaveURL(/actionableByMe/);
    await page.goBack();
    await expect(view).toContainText("Sua decisão (2)");
    await page.reload();
    await expect(view).toContainText("Sua decisão (2)");
    await expect(project).toContainText("Centro Comercial Atlântico");
    const box = (await bar.boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(60);
    const projectBox = (await project.boundingBox())!,
      viewBox = (await view.boundingBox())!;
    expect(projectBox.height).toBeGreaterThanOrEqual(44);
    expect(viewBox.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(projectBox.y - viewBox.y)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await selectOption(project, "");
    await selectOption(view, "all");
    await expect(page).not.toHaveURL(/projectId|status|actionableByMe|page=/);
    await expect(project).toContainText("Todas as obras");
    await expect(view).toContainText("Todos (33)");
  });
