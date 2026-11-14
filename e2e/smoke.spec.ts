import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/", "/yorha-demo"];

test("SSR HTML carries yorha classes", async ({ request }) => {
  for (const route of routes) {
    const html = await (await request.get(route)).text();
    expect(html, route).toMatch(/class="[^"]*(?:bg|text|font)-yorha/);
  }
});

for (const route of routes) {
  test.describe(route, () => {
    test("body background is the light-theme bg token", async ({ page }) => {
      await page.goto(route);
      const { actual, expected } = await page.evaluate((token) => {
        const probe = document.createElement("div");
        probe.style.background = token;
        document.body.appendChild(probe);
        const expected = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { actual: getComputedStyle(document.body).backgroundColor, expected };
      }, process.env.E2E_LIGHT_BG!);
      expect(expected).not.toBe("rgba(0, 0, 0, 0)");
      expect(actual).toBe(expected);
    });

    test("Korean text resolves to the Pretendard stack", async ({ page }) => {
      await page.goto(route);
      const ko = page.locator("body :text-matches('[가-힣]')").first();
      const family = await ko.evaluate((el) => getComputedStyle(el).fontFamily);
      expect(family).toContain("Pretendard Variable");
      expect(family.indexOf("Pretendard Variable")).toBeLessThan(family.indexOf("Noto Sans KR Variable"));
    });

    test("axe finds no violations", async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  });
}

test("Dialog opens and closes by keyboard", async ({ page }) => {
  await page.goto("/yorha-demo");
  const trigger = page.getByRole("button", { name: "데이터 초기화" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
