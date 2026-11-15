import { expect, test, type Page } from "@playwright/test";

// Installed fixture: E2E_APP_URL + E2E_TRANSITIONS_BASE (set by install.sh). Standalone Vite fixture: both unset.
const BASE = process.env.E2E_TRANSITIONS_BASE ?? "";
const APP_URL = process.env.E2E_APP_URL ?? "http://127.0.0.1:5199";
const home = (query = "") => (BASE ? `${BASE}${query}` : `/${query}`);

type Seen = { pseudo: string; name: string; duration: number };

/** Records every ::view-transition pseudo-element animation seen until stopped. */
async function startRecording(page: Page) {
  // Let any running view transition finish so its animations are not attributed to the next one.
  await page.waitForFunction(() => !document.getAnimations().some((a) => (a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith("::view-transition")));
  await page.evaluate(() => {
    const w = window as unknown as { __seen: Map<string, unknown>; __stop: boolean };
    w.__seen = new Map();
    w.__stop = false;
    const tick = () => {
      for (const a of document.getAnimations()) {
        const effect = a.effect as KeyframeEffect | null;
        const pseudo = effect?.pseudoElement;
        if (!pseudo?.startsWith("::view-transition")) continue;
        const name = (a as CSSAnimation).animationName ?? "";
        const duration = Number(effect?.getComputedTiming().duration ?? 0);
        w.__seen.set(`${pseudo}|${name}`, { pseudo, name, duration });
      }
      if (!w.__stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function stopRecording(page: Page): Promise<Seen[]> {
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const w = window as unknown as { __seen: Map<string, Seen>; __stop: boolean };
    w.__stop = true;
    return [...w.__seen.values()];
  });
}

const names = (seen: Seen[]) => seen.map((s) => s.name);
const pseudoName = (pseudo: string) => /\((.*)\)/.exec(pseudo)?.[1] ?? "";

// v4 (V4-010): entry is a stepped clip scan plus a short fade; exit is a fade. Old yorha-route-in-*/out-* names are gone.
test("push scans forward, POP scans back", async ({ page }) => {
  await page.goto(home());
  await expect(page.getByRole("heading", { name: "Units" })).toBeVisible();

  await startRecording(page);
  await page.getByRole("link", { name: "Unit 9S" }).click();
  await expect(page.getByRole("article", { name: "detail" })).toBeVisible();
  const push = await stopRecording(page);
  expect(push.length, "view-transition animations ran on push").toBeGreaterThan(0);
  expect(names(push)).toContain("yorha-route-scan-forward");
  expect(names(push)).toContain("yorha-route-fade-in");
  expect(names(push)).toContain("yorha-route-fade-out");
  expect(names(push)).not.toContain("yorha-route-scan-back");
  await expect(page.locator("[data-route-transition]")).toHaveAttribute("data-direction", "forward");

  await startRecording(page);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Units" })).toBeVisible();
  const pop = await stopRecording(page);
  expect(pop.length, "view-transition animations ran on POP").toBeGreaterThan(0);
  expect(names(pop)).toContain("yorha-route-scan-back");
  expect(names(pop)).toContain("yorha-route-fade-out");
  expect(names(pop)).not.toContain("yorha-route-scan-forward");
  await expect(page.locator("[data-route-transition]")).toHaveAttribute("data-direction", "back");

  // Forward again via history: index is higher than the previous one.
  await startRecording(page);
  await page.goForward();
  await expect(page.getByRole("article", { name: "detail" })).toBeVisible();
  expect(names(await stopRecording(page))).toContain("yorha-route-scan-forward");
});

test("replace navigation fades without a scan", async ({ page }) => {
  await page.goto(home());
  await page.getByRole("link", { name: "Unit 2B" }).click();
  await expect(page.getByRole("article", { name: "detail" })).toBeVisible();
  await startRecording(page);
  await page.getByTestId("replace-home").click();
  await expect(page.getByRole("heading", { name: "Units" })).toBeVisible();
  const seen = await stopRecording(page);
  expect(names(seen)).toContain("yorha-route-fade-in");
  expect(names(seen)).not.toContain("yorha-route-scan-forward");
  expect(names(seen)).not.toContain("yorha-route-scan-back");
});

test("shared element names pair up between list and detail", async ({ page }) => {
  await page.goto(home());
  await startRecording(page);
  await page.getByRole("link", { name: "Unit A2" }).click();
  await expect(page.getByRole("article", { name: "detail" })).toBeVisible();
  const seen = await stopRecording(page);
  const byName = (kind: string) =>
    seen.filter((s) => s.pseudo.startsWith(`::view-transition-${kind}(`)).map((s) => pseudoName(s.pseudo));
  const shared = byName("group").filter((n) => n.includes("unit-title"));
  expect(shared).toEqual(["unit-title-a2"]);
  expect(byName("old")).toContain("unit-title-a2");
  expect(byName("new")).toContain("unit-title-a2");
  // Other cards are not part of the transition.
  expect(byName("group").filter((n) => n.includes("unit-title-2b") || n.includes("unit-title-9s"))).toEqual([]);
  // Shared group follows --motion-shared-element (360ms).
  const group = seen.find((s) => s.pseudo === "::view-transition-group(unit-title-a2)");
  expect(group?.duration).toBe(360);
});

test("route durations come from the motion tokens", async ({ page }) => {
  await page.goto(home());
  await startRecording(page);
  await page.getByRole("link", { name: "Unit 2B" }).click();
  const seen = await stopRecording(page);
  expect(seen.find((s) => s.name === "yorha-route-scan-forward")?.duration).toBe(200);
  expect(seen.find((s) => s.name === "yorha-route-fade-out")?.duration).toBe(120);
});

test("reduced motion fades in 120ms with no scan", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", baseURL: APP_URL, locale: "ko-KR" });
  const page = await context.newPage();
  await page.goto(home());
  await expect(page.locator("[data-route-transition]")).toHaveAttribute("data-route-transition", "reduced");
  await startRecording(page);
  await page.getByRole("link", { name: "Unit 9S" }).click();
  await expect(page.getByRole("article", { name: "detail" })).toBeVisible();
  const seen = await stopRecording(page);
  expect(seen.find((s) => s.name === "yorha-route-fade-in" && s.pseudo.startsWith("::view-transition-new"))?.duration).toBe(120);
  expect(seen.filter((s) => s.name.startsWith("yorha-route-scan-") && s.duration > 0)).toEqual([]);
  const transform = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--motion-spatial").trim());
  expect(transform).toBe("0");
  await context.close();
});

test("motion off renders no view transition", async ({ page }) => {
  await page.goto(home("?motion=off"));
  await expect(page.locator("[data-route-transition]")).toHaveAttribute("data-route-transition", "off");
  await startRecording(page);
  await page.getByRole("link", { name: "Unit 9S" }).click();
  await expect(page.getByRole("article", { name: "detail" })).toBeVisible();
  expect(await stopRecording(page)).toEqual([]);
});

test("without document.startViewTransition the route changes with no animation", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "startViewTransition", { value: undefined, configurable: true });
  });
  await page.goto(home());
  await expect(page.locator("[data-route-transition]")).toHaveAttribute("data-route-transition", "unsupported");
  await startRecording(page);
  await page.getByRole("link", { name: "Unit 9S" }).click();
  await expect(page.getByRole("article", { name: "detail" })).toBeVisible();
  expect(await stopRecording(page)).toEqual([]);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Units" })).toBeVisible();
});
