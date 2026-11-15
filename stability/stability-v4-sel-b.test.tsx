/// <reference types="vite/client" />
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import type { ReactNode } from "react";
import "./mount"; // storybook project annotations + css
import { frames } from "./mount";
import { Menu, MenuArrow, MenuContent, MenuItem, MenuShortcut, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger } from "../registry/yorha/ui/menu/menu";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "../registry/yorha/ui/menubar/menubar";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../registry/yorha/ui/context-menu/context-menu";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "../registry/yorha/ui/navigation-menu/navigation-menu";
import { MenuList, MenuListItem } from "../registry/yorha/ui/menu-list/menu-list";

/** yorha v4 selection B (f-sel-b): V4-165..173. Rendered without the Storybook decorator, motion = full. */
const mounted: { root: Root; container: HTMLElement }[] = [];
afterEach(() => {
  delete document.documentElement.dataset.motion;
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.container.remove();
  }
});

async function render(node: ReactNode): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.lang = "ko";
  container.style.cssText = "padding:80px 40px;min-height:500px";
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  root.render(node);
  await frames(3);
  await document.fonts.ready;
  await frames(2);
  return container;
}
async function until<T>(fn: () => T | null | undefined | false, ms = 3000): Promise<T> {
  const end = performance.now() + ms;
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() > end) throw new Error("until: timeout");
    await frames(1);
  }
}
const q = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);
const cs = (el: Element) => getComputedStyle(el);
const settle = () => frames(40);

const BasicMenu = ({ shortcut }: { shortcut?: string } = {}) => (
  <Menu>
    <MenuTrigger>Open</MenuTrigger>
    <MenuContent>
      <MenuItem shortcut={shortcut}>Save</MenuItem>
      <MenuItem>Plain</MenuItem>
      <MenuSub>
        <MenuSubTrigger>More</MenuSubTrigger>
        <MenuSubContent>
          <MenuItem>Inner</MenuItem>
        </MenuSubContent>
      </MenuSub>
    </MenuContent>
  </Menu>
);

describe("yorha-pop adoption (V4-165)", () => {
  const expectPop = (el: Element) => {
    const s = cs(el);
    expect(s.transitionProperty).toContain("clip-path");
    expect(s.transitionProperty).not.toContain("scale");
    expect(s.transitionProperty).not.toContain("transform");
    // rest clip is a negative inset (focus rings and arrows are not clipped)
    expect(s.clipPath).toMatch(/inset\(-\d/);
  };

  it("menu popup and its submenu use the stepped pop; the submenu opens from the parent's edge", async () => {
    await render(<BasicMenu />);
    await userEvent.click(q('[data-slot="menu-trigger"]')!);
    const popup = await until(() => q('[data-slot="menu-content"]'));
    await settle();
    expectPop(popup);
    const trigger = q('[data-slot="menu-sub-trigger"]')!;
    await userEvent.click(trigger);
    const subs = await until(() => (document.querySelectorAll('[data-slot="menu-content"]').length === 2 ? document.querySelectorAll<HTMLElement>('[data-slot="menu-content"]') : null));
    await settle();
    const sub = subs[1]!;
    expectPop(sub);
    expect(sub.getAttribute("data-side")).toBe("inline-end");
    const parent = popup.getBoundingClientRect();
    expect(Math.abs(sub.getBoundingClientRect().left - parent.right)).toBeLessThanOrEqual(2);
  });

  it("menubar, context-menu and navigation-menu popups use the stepped pop", async () => {
    await render(
      <>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </>,
    );
    await userEvent.click(q('[data-slot="menubar-trigger"]')!);
    const bar = await until(() => q('[data-slot="menu-content"]'));
    await settle();
    expectPop(bar);
  });

  it("context-menu popup", async () => {
    await render(
      <ContextMenu>
        <ContextMenuTrigger aria-label="area" style={{ height: 120 }}>
          area
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Copy</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    q('[data-slot="context-menu-trigger"]')!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: 100, clientY: 150 }));
    const popup = await until(() => q('[data-slot="context-menu-content"]'));
    await settle();
    expectPop(popup);
  });

  it("navigation-menu popup", async () => {
    await render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="#a">Alpha</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    await userEvent.click(q('[data-slot="navigation-menu-trigger"]')!);
    const popup = await until(() => q('[data-slot="navigation-menu-popup"]'));
    await settle();
    expectPop(popup);
  });
});

describe("scroll cue (V4-166)", () => {
  const rows = Array.from({ length: 40 }, (_, i) => i);
  it("a long menu scrolls inside the viewport and carries the cue", async () => {
    await render(
      <Menu>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent>
          {rows.map((i) => (
            <MenuItem key={i}>Row {i}</MenuItem>
          ))}
        </MenuContent>
      </Menu>,
    );
    await userEvent.click(q('[data-slot="menu-trigger"]')!);
    const popup = await until(() => q('[data-slot="menu-content"]'));
    await settle();
    const body = popup.querySelector<HTMLElement>('[data-slot="menu-scroll"]')!;
    expect(body, "scroll body").not.toBeNull();
    expect(cs(body).overflowY).toBe("auto");
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    expect(popup.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    expect(cs(body).backgroundAttachment).toContain("local");
    expect(cs(body).backgroundImage).toContain("linear-gradient");
  });
  it("a long context menu too", async () => {
    await render(
      <ContextMenu>
        <ContextMenuTrigger aria-label="area" style={{ height: 120 }}>
          area
        </ContextMenuTrigger>
        <ContextMenuContent>
          {rows.map((i) => (
            <ContextMenuItem key={i}>Row {i}</ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>,
    );
    q('[data-slot="context-menu-trigger"]')!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: 100, clientY: 150 }));
    const popup = await until(() => q('[data-slot="context-menu-content"]'));
    await settle();
    const body = popup.querySelector<HTMLElement>('[data-slot="context-menu-scroll"]')!;
    expect(body).not.toBeNull();
    expect(cs(body).overflowY).toBe("auto");
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    expect(cs(body).backgroundAttachment).toContain("local");
  });
});

describe("MenuList stream (V4-167)", () => {
  it("each row runs one smooth yorha-stream-in (ease-out, once, index * stagger delay) and no transform/opacity transition", async () => {
    await render(
      <MenuList aria-label="list">
        {["a", "b", "c", "d"].map((v) => (
          <MenuListItem key={v} value={v}>
            {v}
          </MenuListItem>
        ))}
      </MenuList>,
    );
    const rowEls = [...document.querySelectorAll<HTMLElement>("[data-menu-item]")];
    const fourth = rowEls[3]!;
    expect(cs(fourth).animationName).toBe("yorha-stream-in");
    expect(cs(fourth).animationTimingFunction).toBe("cubic-bezier(0.23, 1, 0.32, 1)");
    expect(cs(fourth).animationIterationCount).toBe("1");
    expect(cs(rowEls[0]!).animationDelay).toBe("0s");
    expect(cs(fourth).animationDelay).toBe("0.12s"); // 3 * --motion-stagger (40ms)
    expect(cs(fourth).transitionProperty).not.toContain("opacity");
    expect(cs(fourth).transitionProperty).not.toContain("translate");
    expect(fourth.style.getPropertyValue("--yorha-stagger-index")).toBe("3");
    expect(cs(rowEls[0]!).animationDelay).not.toBe(cs(fourth).animationDelay);
  });
});

describe("context-menu trigger (V4-168)", () => {
  it("suppresses the iOS callout", async () => {
    await render(
      <ContextMenu>
        <ContextMenuTrigger aria-label="area">area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Copy</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    const t = q('[data-slot="context-menu-trigger"]')!;
    const v = cs(t).getPropertyValue("-webkit-touch-callout");
    // Chromium has no such property (the CSSOM drops the declaration), WebKit does: check the computed value where it exists,
    // otherwise the authored utility on the trigger.
    expect(v === "none" || t.className.includes("[-webkit-touch-callout:none]"), `computed "${v}" class "${t.className}"`).toBe(true);
    expect(cs(t).cursor).not.toBe("context-menu");
  });
});

describe("shortcut display (V4-169)", () => {
  const withPlatform = async (platform: string, fn: () => Promise<void>) => {
    const orig = Object.getOwnPropertyDescriptor(Navigator.prototype, "platform")!;
    Object.defineProperty(navigator, "platform", { value: platform, configurable: true });
    try {
      await fn();
    } finally {
      delete (navigator as unknown as Record<string, unknown>).platform;
      Object.defineProperty(Navigator.prototype, "platform", orig);
    }
  };
  it("renders KbdCombo and aria-keyshortcuts per platform; rows keep their height", async () => {
    for (const [platform, expected] of [["MacIntel", "Meta+S"], ["Win32", "Control+S"]] as const) {
      await withPlatform(platform, async () => {
        await render(<BasicMenu shortcut="mod+S" />);
        await userEvent.click(q('[data-slot="menu-trigger"]')!);
        const save = await until(() => q('[data-slot="menu-item"]'));
        await settle();
        expect(save.getAttribute("aria-keyshortcuts")).toBe(expected);
        expect(save.querySelector('[data-slot="kbd-combo"]')).not.toBeNull();
        const items = document.querySelectorAll<HTMLElement>('[data-slot="menu-item"]');
        expect(items[0]!.getBoundingClientRect().height).toBe(items[1]!.getBoundingClientRect().height);
        await userEvent.keyboard("{Escape}");
        await frames(30);
      });
      mounted.splice(0).forEach((m) => {
        m.root.unmount();
        m.container.remove();
      });
    }
  });
  it("ContextMenuItem takes the same prop", async () => {
    await render(
      <ContextMenu>
        <ContextMenuTrigger aria-label="area" style={{ height: 120 }}>
          area
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem shortcut="shift+K">Copy</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    q('[data-slot="context-menu-trigger"]')!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: 100, clientY: 150 }));
    const item = await until(() => q('[data-slot="context-menu-item"]'));
    expect(item.getAttribute("aria-keyshortcuts")).toBe("Shift+K");
    expect(item.querySelector('[data-slot="kbd-combo"]')).not.toBeNull();
  });
});

describe("menubar F10 (V4-170)", () => {
  it("F10 focuses the first enabled trigger", async () => {
    await render(
      <>
        <button type="button" id="before">before</button>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger disabled>Off</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>x</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </>,
    );
    q("#before")!.focus();
    await userEvent.keyboard("{F10}");
    await frames(2);
    expect(document.activeElement?.textContent).toBe("File");
    expect(document.activeElement?.getAttribute("data-slot")).toBe("menubar-trigger");
  });
});

describe("navigation-menu delay (V4-172)", () => {
  it("delay and closeDelay reach the root", async () => {
    await render(
      <NavigationMenu delay={0} closeDelay={0}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="#a">Alpha</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    await userEvent.hover(q('[data-slot="navigation-menu-trigger"]')!);
    await until(() => q('[data-slot="navigation-menu-popup"]'), 800);
  });
});

describe("pixel arrows (V4-173)", () => {
  const noRotate = (el: Element) => {
    expect(el.querySelector("svg[data-slot=glyph]"), "glyph arrow").not.toBeNull();
    for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
      const s = cs(n);
      if (n.matches("[data-slot$=arrow]")) expect(s.rotate === "none" || s.rotate === "0deg").toBe(true);
      expect(s.transform === "none" || !/matrix\(0\.7/.test(s.transform)).toBe(true);
    }
    expect(el.querySelector("svg")!.getAttribute("shape-rendering")).toBe("crispEdges");
  };
  it("menu arrow", async () => {
    await render(
      <Menu>
        <MenuTrigger>Open</MenuTrigger>
        <MenuContent>
          <MenuArrow />
          <MenuItem>One</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await userEvent.click(q('[data-slot="menu-trigger"]')!);
    await until(() => q('[data-slot="menu-arrow"]'));
    await settle();
    noRotate(q('[data-slot="menu-arrow"]')!);
    expect(q('[data-slot="menu-arrow"]')!.getBoundingClientRect().width).toBeGreaterThan(0);
  });
  it("context-menu arrow", async () => {
    await render(
      <ContextMenu>
        <ContextMenuTrigger aria-label="area" style={{ height: 120 }}>
          area
        </ContextMenuTrigger>
        <ContextMenuContent arrow>
          <ContextMenuItem>Copy</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    q('[data-slot="context-menu-trigger"]')!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: 100, clientY: 150 }));
    await until(() => q('[data-slot="context-menu-arrow"]'));
    noRotate(q('[data-slot="context-menu-arrow"]')!);
  });
  it("navigation-menu arrow", async () => {
    await render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="#a">Alpha</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    await userEvent.click(q('[data-slot="navigation-menu-trigger"]')!);
    await until(() => q('[data-slot="navigation-menu-arrow"]'));
    await settle();
    noRotate(q('[data-slot="navigation-menu-arrow"]')!);
  });
});

void MenuShortcut;
