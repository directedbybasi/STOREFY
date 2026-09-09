import { test, expect } from "@playwright/test";

test.describe("STOREFY Platform Smoke Tests", () => {
  test("health endpoint returns status HEALTHY", async ({ request }) => {
    const response = await request.get("/api/v1/health");
    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("HEALTHY");
    expect(json.data.platform).toBe("STOREFY");
  });

  test("root homepage loads platform title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/STOREFY/);
    await expect(page.locator("text=Phase 1 Foundation Active")).toBeVisible();
  });
});
