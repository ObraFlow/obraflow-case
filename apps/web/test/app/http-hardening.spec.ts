import { test, expect, type Page } from "@playwright/test";

async function inspect(page: Page, method = "GET") {
  return page.evaluate(async (method) => {
    const path = "/src/lib/api.ts",
      api = await import(path);
    try {
      await api.request("/suppliers", { method });
      return { ok: true };
    } catch (error) {
      const failure = error as Error & { status?: number; code?: string; details?: unknown };
      return {
        ok: false,
        isApiError: error instanceof api.ApiError,
        name: failure.name,
        status: failure.status,
        code: failure.code,
        message: failure.message,
        details: failure.details,
      };
    }
  }, method);
}
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
});

for (const body of ["", "<html>Gateway response</html>", "null", "[]", '"unexpected"'])
  test(`invalid successful JSON is an uncertain transport response (${JSON.stringify(body)})`, async ({ page }) => {
    await page.route("**/api/v1/suppliers", (route) =>
      route.fulfill({ status: 201, contentType: "application/json", body }),
    );
    const result = await inspect(page, "POST");
    expect(result).toMatchObject({ ok: false, isApiError: false, name: "InvalidApiResponse", status: 201 });
    expect(result.message).not.toMatch(/JSON|Unexpected token|position/);
  });

test("malformed error envelopes retain HTTP status and provide only safe field issues", async ({ page }) => {
  let body: unknown = { error: { code: { bad: true }, message: ["bad"], details: { map: "not an array" } } };
  await page.route("**/api/v1/suppliers", (route) => route.fulfill({ status: 400, json: body }));
  expect(await inspect(page)).toMatchObject({ isApiError: true, status: 400, code: "REQUEST_FAILED", details: [] });
  body = {
    error: {
      code: "VALIDATION_ERROR",
      message: "Revise o nome.",
      details: [
        null,
        1,
        { field: "name", code: "invalid", message: "Nome inválido." },
        { field: {}, code: "invalid", message: "bad" },
        { field: "name", code: "bad", message: {} },
      ],
    },
  };
  expect(await inspect(page)).toMatchObject({
    isApiError: true,
    status: 400,
    code: "VALIDATION_ERROR",
    message: "Revise o nome.",
    details: [{ field: "name", code: "invalid", message: "Nome inválido." }],
  });
  body = { error: null };
  expect(await inspect(page)).toMatchObject({ isApiError: true, status: 400, code: "REQUEST_FAILED", details: [] });
});

test("a late 401 cannot dispatch unauthorized for a newer session", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let authorization: string | undefined;
  await page.route("**/api/v1/suppliers", async (route) => {
    authorization = route.request().headers().authorization;
    await gate;
    await route.fulfill({ status: 401, body: "invalid error JSON" });
  });
  await page.evaluate(() => sessionStorage.setItem("obraflow.accessToken", "old-session"));
  const started = page.waitForRequest("**/api/v1/suppliers");
  const response = inspect(page);
  await started;
  await page.evaluate(() => {
    sessionStorage.setItem("obraflow.accessToken", "new-session");
    (window as typeof window & { unauthorized: number }).unauthorized = 0;
    window.addEventListener("obraflow:unauthorized", () => {
      (window as typeof window & { unauthorized: number }).unauthorized++;
    });
  });
  release();
  expect(await response).toMatchObject({ isApiError: true, status: 401, code: "REQUEST_FAILED", details: [] });
  expect(authorization).toBe("Bearer old-session");
  expect(
    await page.evaluate(() => ({
      token: sessionStorage.getItem("obraflow.accessToken"),
      events: (window as typeof window & { unauthorized: number }).unauthorized,
    })),
  ).toEqual({ token: "new-session", events: 0 });
});

test("aborted reads retain their abort reason", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const path = "/src/lib/api.ts",
      api = await import(path),
      controller = new AbortController();
    controller.abort();
    try {
      await api.request("/suppliers", { signal: controller.signal });
      return "unexpected success";
    } catch (error) {
      return (error as Error).name;
    }
  });
  expect(result).toBe("AbortError");
});
