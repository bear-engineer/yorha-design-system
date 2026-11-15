import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import "./mount"; // global css (tokens, utilities)
import { animationsFinished, frames } from "./mount";
import { MenuList, MenuListItem } from "../registry/yorha/ui/menu-list/menu-list";
import { TimelineGraph } from "../registry/yorha/ui/timeline/timeline";

// v4 docs-curation: row rule lives in MenuList; timeline toolbar readout and icon gap.

const hosts: HTMLElement[] = [];
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
});

async function mount(node: React.ReactNode, width = 900): Promise<HTMLElement> {
  const host = document.createElement("div");
  host.lang = "ko";
  host.style.cssText = `position:absolute;left:16px;top:16px;width:${width}px;color:#000;background:#fff`;
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(3);
  return host;
}

describe("MenuList row rule", () => {
  it("every row draws a 1px bottom rule (reserved top), selecting moves nothing", async () => {
    const host = await mount(
      <MenuList defaultValue="b">
        <MenuListItem value="a">화면 설정</MenuListItem>
        <MenuListItem value="b">사운드 설정</MenuListItem>
        <MenuListItem value="c" disabled>네트워크</MenuListItem>
        <MenuListItem value="d">언어</MenuListItem>
      </MenuList>,
      300,
    );
    await animationsFinished();
    const rows = [...host.querySelectorAll<HTMLElement>("[data-menu-item]")];
    const before = rows.map((r) => r.getBoundingClientRect().top);
    for (const r of rows) {
      const cs = getComputedStyle(r);
      expect(cs.borderBottomWidth, r.textContent ?? "").toBe("1px");
      expect(cs.borderBottomStyle).toBe("solid");
      expect(cs.borderBottomColor).not.toBe("rgba(0, 0, 0, 0)");
      expect(cs.borderTopWidth).toBe("1px");
    }
    (rows[0] as HTMLElement).focus();
    await frames(3);
    expect(rows.map((r) => r.getBoundingClientRect().top)).toEqual(before);
  });
});

describe("Timeline toolbar", () => {
  it("fit readout shows the scale (not a second 맞춤) and the now icon has a gap to its label", async () => {
    const host = await mount(
      <TimelineGraph
        label="일정"
        lanes={[{ id: "a", label: "기획" }]}
        items={[{ id: "x", lane: "a", title: "정리", start: new Date(2026, 10, 16, 9), end: new Date(2026, 10, 18, 18) }]}
        range={{ start: new Date(2026, 10, 16), end: new Date(2026, 10, 30) }}
        now={new Date(2026, 10, 17, 12)}
        defaultZoom="fit"
      />,
    );
    const label = host.querySelector<HTMLElement>('[data-part="scale-label"]')!;
    expect(label.textContent).toMatch(/^1일 = [\d.]+px$/);
    const nowBtn = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("현재로"))!;
    const icon = nowBtn.querySelector("span")!.getBoundingClientRect();
    const range = document.createRange();
    const textNode = [...nowBtn.childNodes].find((n) => n.nodeType === 3 && n.textContent?.includes("현재로"))!;
    range.selectNodeContents(textNode);
    const text = range.getBoundingClientRect();
    expect(text.left - icon.right).toBeGreaterThanOrEqual(4);
    const glyph = nowBtn.querySelector<SVGElement>('[data-glyph="diamond-target"]')!.getBoundingClientRect();
    expect(glyph.right).toBeLessThanOrEqual(icon.right + 0.01);
  });
});
