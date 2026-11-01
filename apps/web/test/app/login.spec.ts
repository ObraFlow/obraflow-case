import { test, expect } from "@playwright/test";

test("password visibility, repeated login and failure recovery preserve credentials and the protected destination", async ({
  page,
}) => {
  await page.goto("/purchase-orders?status=APPROVED&pageSize=1");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Usuário", { exact: true }).fill("joao");
  const password = page.getByLabel("Senha", { exact: true });
  await password.fill(process.env.SEED_USER_PASSWORD ?? "demo-user-2026");
  await page.getByRole("button", { name: "Mostrar senha", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar senha", exact: true }).click();
  await expect(password).toHaveAttribute("type", "password");
  let writes = 0,
    release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/auth/login", async (route) => {
    writes++;
    await held;
    await route.fulfill({
      status: 401,
      json: { error: { code: "INVALID_CREDENTIALS", message: "Usuário ou senha inválidos.", details: [] } },
    });
  });
  await page.getByRole("button", { name: "Entrar", exact: true }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  try {
    await expect.poll(() => writes).toBe(1);
    await expect(page.getByRole("button", { name: "Entrando…", exact: true })).toBeDisabled();
    await expect(password).toBeDisabled();
    await expect(page.getByRole("button", { name: "Mostrar senha", exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", {
        name: "Explore o fluxo de aprovação Acesse com as contas de demonstração do ambiente.",
        exact: true,
      }),
    ).toBeDisabled();
  } finally {
    release();
  }
  await expect(page.getByRole("alert")).toContainText("Usuário ou senha inválidos.");
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByLabel("Usuário", { exact: true })).toHaveValue("joao");
  await expect(password).toHaveValue(process.env.SEED_USER_PASSWORD ?? "demo-user-2026");
  expect(writes).toBe(1);
  await page.unroute("**/auth/login");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/purchase-orders\?status=APPROVED&pageSize=1$/);
});

test("demo scenarios retain credential errors and block repeated sign-in while pending", async ({ page }) => {
  await page.goto("/login");
  await page
    .getByRole("button", {
      name: "Explore o fluxo de aprovação Acesse com as contas de demonstração do ambiente.",
      exact: true,
    })
    .click();
  await expect(page.getByRole("region", { name: "Solicitante", exact: true }).getByRole("button")).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Aprovador", exact: true }).getByRole("button")).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Administrador", exact: true }).getByRole("button")).toHaveCount(1);
  let writes = 0,
    release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/auth/login", async (route) => {
    writes++;
    await held;
    await route.fulfill({
      status: 401,
      json: { error: { code: "INVALID_CREDENTIALS", message: "Usuário ou senha inválidos.", details: [] } },
    });
  });
  await page.getByRole("button", { name: "Entrar como Carlos", exact: false }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  try {
    await expect.poll(() => writes).toBe(1);
    await expect(page.getByRole("button", { name: "Entrar com usuário e senha", exact: true })).toBeDisabled();
    for (const button of await page.getByRole("group", { name: "Personas de demonstração" }).getByRole("button").all())
      await expect(button).toBeDisabled();
  } finally {
    release();
  }
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByRole("alert")).toContainText("Usuário ou senha inválidos.");
  await page.getByRole("button", { name: "Entrar com usuário e senha", exact: true }).click();
  await expect(page.getByLabel("Usuário", { exact: true })).toHaveValue("carlos");
  await expect(page.getByLabel("Usuário", { exact: true })).toBeFocused();
  expect(writes).toBe(1);
});
