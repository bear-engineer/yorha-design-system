import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import "./mount"; // global css (tokens, utilities)
import { animationsFinished, frames } from "./mount";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../registry/yorha/ui/menu/menu";

// v4 detail-b: Menu highlighted row is a plain ink band, no lighter frame/seam inside or around it.

const hosts: HTMLElement[] = [];
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
});

async function mount(node: React.ReactNode): Promise<HTMLElement> {
  const host = document.createElement("div");
  host.lang = "ko";
  host.style.cssText = "position:absolute;left:16px;top:16px;width:400px;color:#000;background:#fff";
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(2);
  return host;
}

const colour = (v: string) => v.match(/oklch\([^)]*\)|rgb[^)]*\)/)![0];

describe("Menu ink band seam (#22)", () => {
  it("a highlighted + focused row has no lighter 1px frame: border and outline are the band colour", async () => {
    await mount(
      <Menu defaultOpen>
        <MenuTrigger>파일 메뉴</MenuTrigger>
        <MenuContent>
          <MenuItem>새 문서</MenuItem>
          <MenuItem>열기</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await animationsFinished();
    const rows = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")];
    expect(rows.length).toBe(2);
    rows[0].focus();
    rows[0].dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
    await frames(3);
    const cs = getComputedStyle(rows[0]);
    expect(rows[0].hasAttribute("data-highlighted")).toBe(true);
    const band = colour(cs.backgroundImage);
    expect(cs.backgroundSize).toBe("100% 100%");
    expect(cs.borderTopWidth === "0px" || colour(cs.borderTopColor) === band).toBe(true);
    // the keyboard-focus frame (on-ink coloured) must not read as a seam on a mouse/keyboard highlight
    expect(cs.outlineStyle === "none" || cs.outlineWidth === "0px" || colour(cs.outlineColor) === band).toBe(true);
  });
});
