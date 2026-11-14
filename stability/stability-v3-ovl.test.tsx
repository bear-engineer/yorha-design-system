import { createElement, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // storybook project annotations + css
import { Button } from "../registry/yorha/ui/button/button";
import { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "../registry/yorha/ui/popover/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../registry/yorha/ui/tooltip/tooltip";
import { expectAnchoredBelow, expectSameHeight } from "../.storybook/geometry";
import { frames } from "./mount";

/**
 * yorha v3 overlay family (f-ovl): geometry and state assertions for the FOVL findings.
 * Each describe block names the finding ids it guards. Rendered without the Storybook decorator, motion = full.
 */
const mounted: { root: Root; container: HTMLElement }[] = [];
afterEach(() => {
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
const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const until = async (fn: () => boolean, ms = 3000) => {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error(`timeout waiting for ${fn.toString().slice(0, 80)}`);
};

describe("popover and tooltip triggers, close, anchor (FOVL-10, FOVL-11)", () => {
  it("FOVL-10: popover and tooltip triggers are Buttons (same height, same slot recipe)", async () => {
    const c = await render(
      <TooltipProvider>
        <div style={{ display: "flex", gap: 8 }}>
          <Button data-ref>기준</Button>
          <Popover>
            <PopoverTrigger>팝오버</PopoverTrigger>
          </Popover>
          <Tooltip>
            <TooltipTrigger>툴팁</TooltipTrigger>
            <TooltipContent>도움말</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>,
    );
    const ref = q("[data-ref]", c)!;
    const pop = q('[data-slot="popover-trigger"]', c)!;
    const tip = q('[data-slot="tooltip-trigger"]', c)!;
    expectSameHeight(ref, pop, tip);
    // button recipe: ink wipe layer + press scale come from buttonVariants
    for (const el of [pop, tip]) {
      expect(getComputedStyle(el).backgroundImage).toContain("linear-gradient");
      expect(el.className).toContain("yorha-press");
    }
  });

  it("FOVL-10: PopoverContent anchor (element) positions the popup under the anchor, not the trigger", async () => {
    let anchorEl: HTMLElement | null = null;
    const c = await render(
      <div>
        <div data-anchor ref={(el) => void (anchorEl = el)} style={{ width: 300, height: 40, marginLeft: 120, border: "1px solid" }} />
        <Popover defaultOpen>
          <PopoverTrigger>열기</PopoverTrigger>
          <PopoverContent anchor={() => anchorEl} data-testid="pop">
            <PopoverTitle>제목</PopoverTitle>
            <PopoverDescription>본문</PopoverDescription>
          </PopoverContent>
        </Popover>
      </div>,
    );
    await until(() => !!q('[data-slot="popover-content"]') && q('[data-slot="popover-content"]')!.getBoundingClientRect().height > 0);
    await frames(3);
    const popup = q('[data-slot="popover-content"]')!;
    expectAnchoredBelow(popup, q("[data-anchor]", c)!, { gap: 8, align: "start" });
  });

  it("FOVL-10: PopoverContent anchor accepts a ref object", async () => {
    function Host() {
      const ref = useRef<HTMLDivElement>(null);
      return (
        <div>
          <div data-anchor ref={ref} style={{ width: 200, height: 32, marginLeft: 200, border: "1px solid" }} />
          <Popover defaultOpen>
            <PopoverTrigger>열기</PopoverTrigger>
            <PopoverContent anchor={ref}>
              <PopoverDescription>본문</PopoverDescription>
            </PopoverContent>
          </Popover>
        </div>
      );
    }
    const c = await render(createElement(Host));
    await until(() => !!q('[data-slot="popover-content"]'));
    await frames(4);
    expectAnchoredBelow(q('[data-slot="popover-content"]')!, q("[data-anchor]", c)!, { gap: 8, align: "start" });
  });

  it("FOVL-11: PopoverClose is a Button sm (ghost) and a pointer-opened popover does not focus it", async () => {
    await render(
      <div>
        <Button data-ref size="sm">기준</Button>
        <Popover>
          <PopoverTrigger>열기</PopoverTrigger>
          <PopoverContent>
            <PopoverTitle>제목</PopoverTitle>
            <PopoverDescription>본문</PopoverDescription>
            <PopoverClose>닫기</PopoverClose>
          </PopoverContent>
        </Popover>
      </div>,
    );
    await userEvent.click(q('[data-slot="popover-trigger"]')!);
    await until(() => !!q('[data-slot="popover-close"]'));
    await frames(4);
    const close = q('[data-slot="popover-close"]')!;
    expectSameHeight(q("[data-ref]")!, close);
    expect(document.activeElement).not.toBe(close);
    expect(document.activeElement).toBe(q('[data-slot="popover-content"]'));
  });

  it("FOVL-11: a keyboard-opened popover focuses its first control", async () => {
    await render(
      <Popover>
        <PopoverTrigger>열기</PopoverTrigger>
        <PopoverContent>
          <PopoverDescription>본문</PopoverDescription>
          <PopoverClose>닫기</PopoverClose>
        </PopoverContent>
      </Popover>,
    );
    q('[data-slot="popover-trigger"]')!.focus();
    await userEvent.keyboard("{Enter}");
    await until(() => !!q('[data-slot="popover-close"]'));
    await frames(4);
    expect(document.activeElement).toBe(q('[data-slot="popover-close"]'));
  });
});
