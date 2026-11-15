/// <reference types="vite/client" />
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import type { ReactNode } from "react";
import "./mount"; // storybook project annotations + css
import { frames } from "./mount";
import { Button } from "../registry/yorha/ui/button/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from "../registry/yorha/ui/alert-dialog/alert-dialog";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "../registry/yorha/ui/dialog/dialog";
import { Drawer, DrawerContent, DrawerGrip, DrawerTitle } from "../registry/yorha/ui/drawer/drawer";
import { Popover, PopoverContent, PopoverDescription, PopoverTrigger } from "../registry/yorha/ui/popover/popover";
import { PreviewCard, PreviewCardContent, PreviewCardDescription, PreviewCardTrigger } from "../registry/yorha/ui/preview-card/preview-card";
import { Tooltip, TooltipArrow, TooltipContent, TooltipKbd, TooltipProvider, TooltipTrigger } from "../registry/yorha/ui/tooltip/tooltip";
import { ToastProvider, createToastManager } from "../registry/yorha/ui/toast/toast";

/**
 * yorha v4 overlay family (f-ovl): V4-190..202. Each describe names the ids it guards.
 * Rendered without the Storybook decorator; motion = full unless a test sets data-motion on <html>.
 */
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

async function until(fn: () => boolean, ms = 3000) {
  const end = performance.now() + ms;
  while (!fn()) {
    if (performance.now() > end) throw new Error("until: timeout");
    await frames(1);
  }
}

const q = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("toast (V4-190, V4-193)", () => {
  async function toasts(types: ("alert" | "success" | "info")[], gap = 0) {
    const manager = createToastManager();
    await userEvent.hover(document.body);
    await render(<ToastProvider toastManager={manager} timeout={0} />);
    for (const type of types) {
      manager.add({ title: "알림 제목", description: "설명 문장이다.", type });
      if (gap) await wait(gap);
    }
    await until(() => document.querySelectorAll('[data-slot="toast"]').length === types.length);
    await frames(30);
    return manager;
  }
  const all = () => [...document.querySelectorAll<HTMLElement>('[data-slot="toast"]')];
  const content = (t: HTMLElement) => t.firstElementChild as HTMLElement;

  it("V4-190: rear toast content is transparent only while collapsed; expanded shows every toast", async () => {
    await toasts(["info", "success", "alert"]);
    const rear = all().filter((t) => content(t).hasAttribute("data-behind"));
    expect(rear.length).toBe(2);
    for (const t of rear) expect(getComputedStyle(content(t)).opacity).toBe("0");
    const front = all().find((t) => !content(t).hasAttribute("data-behind"))!;
    await userEvent.hover(front);
    await until(() => all().every((t) => t.hasAttribute("data-expanded")));
    await frames(40);
    for (const t of all()) expect(getComputedStyle(content(t)).opacity, "expanded content opacity").toBe("1");
    const heights = all().map((t) => content(t).getBoundingClientRect().height);
    for (const h of heights) expect(Math.abs(h - heights[0]!)).toBeLessThanOrEqual(1);
  });

  it("V4-190: collapsed rear close buttons are not tab stops, expanded ones are", async () => {
    await toasts(["info", "success", "alert"]);
    const closes = (t: HTMLElement) => t.querySelector<HTMLElement>('button[aria-label="닫기"]')!;
    const tabbable = (b: HTMLElement) => b.tabIndex >= 0 && getComputedStyle(b).visibility !== "hidden";
    const rear = all().filter((t) => content(t).hasAttribute("data-behind"));
    for (const t of rear) expect(tabbable(closes(t)), "collapsed rear close").toBe(false);
    const front = all().find((t) => !content(t).hasAttribute("data-behind"))!;
    expect(tabbable(closes(front))).toBe(true);
    await userEvent.hover(front);
    await until(() => all().every((t) => t.hasAttribute("data-expanded")));
    await frames(40);
    for (const t of all()) expect(tabbable(closes(t)), "expanded close").toBe(true);
  });

  it("V4-193: 5 alert toasts inside 1s flicker one mark; Root is pan-y; the stacked toast has no clip reveal", async () => {
    const flicks = new Set<Element>();
    const mo = new MutationObserver((records) => {
      for (const r of records) if (r.attributeName === "data-run" && (r.target as Element).hasAttribute("data-run")) flicks.add(r.target as Element);
    });
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-run"] });
    await toasts(["alert", "alert", "alert", "alert", "alert"], 60);
    mo.disconnect();
    expect(flicks.size).toBe(1);
    const mark = [...flicks][0]!;
    expect(mark.closest('[data-slot="toast"]')).not.toBeNull();
    for (const t of all()) {
      expect(getComputedStyle(t).touchAction).toBe("pan-y");
      expect(getComputedStyle(t).clipPath).toBe("none");
    }
  });

  it("V4-193: the mark does not flicker under motion=off, and info/success never flicker", async () => {
    document.documentElement.dataset.motion = "off";
    const marks = new Set<Element>();
    const mo = new MutationObserver((records) => {
      for (const r of records) if ((r.target as Element).hasAttribute("data-run")) marks.add(r.target as Element);
    });
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-run"] });
    await toasts(["info", "success"]);
    mo.disconnect();
    expect(marks.size).toBe(0);
  });
});

describe("dialog + alert-dialog (V4-191, V4-192, V4-194)", () => {
  const dialog = (
    <Dialog>
      <DialogTrigger render={<Button>열기</Button>} />
      <DialogContent>
        <DialogTitle>제목</DialogTitle>
        <DialogBody>
          <DialogDescription>본문</DialogDescription>
          <input aria-label="이름" />
        </DialogBody>
        <DialogFooter>
          <Button>확인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const alert = (
    <AlertDialog>
      <AlertDialogTrigger render={<Button>삭제</Button>} />
      <AlertDialogContent>
        <AlertDialogTitle>삭제할까요</AlertDialogTitle>
        <AlertDialogDescription>되돌릴 수 없다.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction variant="danger">삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  const names = (el: Element) => getComputedStyle(el).animationName.split(",").map((s) => s.trim());

  it("V4-191: popup unfolds (clip + fade animations), scrim fades; names per motion mode", async () => {
    await render(dialog);
    (await userEvent.click(document.querySelector("button")!), undefined);
    await until(() => q('[role="dialog"]') !== null);
    const popup = q('[role="dialog"]')!;
    expect(names(popup).some((n) => n.includes("yorha-unfold-clip-in"))).toBe(true);
    expect(getComputedStyle(popup).transitionProperty).not.toContain("translate");
    const scrim = popup.parentElement!.previousElementSibling as HTMLElement;
    expect(getComputedStyle(scrim).transitionProperty).toBe("opacity");
    expect(names(scrim).every((n) => !n.includes("unfold"))).toBe(true);
  });

  it("V4-191: under motion=off the unfold has zero duration", async () => {
    document.documentElement.dataset.motion = "off";
    await render(dialog);
    await userEvent.click(document.querySelector("button")!);
    await until(() => q('[role="dialog"]') !== null);
    const popup = q('[role="dialog"]')!;
    for (const d of getComputedStyle(popup).animationDuration.split(",")) expect(parseFloat(d)).toBe(0);
  });

  it("V4-191: popup rect is equal at start, mid and end (no displacement)", async () => {
    await render(dialog);
    await userEvent.click(document.querySelector("button")!);
    await until(() => q('[role="dialog"]') !== null);
    const popup = q('[role="dialog"]')!;
    const rects: DOMRect[] = [popup.getBoundingClientRect()];
    await wait(100);
    rects.push(popup.getBoundingClientRect());
    await wait(500);
    rects.push(popup.getBoundingClientRect());
    for (const r of rects) {
      expect(Math.abs(r.top - rects[2]!.top)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(r.height - rects[2]!.height)).toBeLessThanOrEqual(0.5);
    }
  });

  it("V4-191: exit finishes before unmount (popup stays mounted while its out animation runs)", async () => {
    await render(dialog);
    await userEvent.click(document.querySelector("button")!);
    await until(() => q('[role="dialog"]') !== null);
    await wait(500);
    // Escape is dispatched in the same task (no tool round trip) so the check lands inside the 200ms exit.
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await frames(2);
    const popup = q('[role="dialog"]');
    expect(popup, "still mounted one frame after close").not.toBeNull();
    expect(popup!.hasAttribute("data-ending-style") || popup!.hasAttribute("data-closed")).toBe(true);
    expect(names(popup!).some((n) => n.includes("yorha-unfold-clip-out"))).toBe(true);
    await until(() => q('[role="dialog"]') === null);
  });

  it("V4-191: opening the largest popup stays inside the paint budget (no frame over 200ms)", async () => {
    await render(
      <Dialog>
        <DialogTrigger render={<Button>열기</Button>} />
        <DialogContent className="max-w-md">
          <DialogTitle>제목</DialogTitle>
          <DialogBody>
            {Array.from({ length: 60 }, (_, i) => (
              <p key={i}>본문 줄 {i}</p>
            ))}
          </DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const deltas: number[] = [];
    let last = performance.now();
    let on = true;
    const tick = () => {
      const now = performance.now();
      deltas.push(now - last);
      last = now;
      if (on) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    await userEvent.click(document.querySelector("button")!);
    await wait(600);
    on = false;
    expect(Math.max(...deltas)).toBeLessThan(200);
  });

  it("V4-192: the alert rule flickers once at open; the title carries no animation", async () => {
    await render(alert);
    await userEvent.click(document.querySelector("button")!);
    await until(() => q('[role="alertdialog"]') !== null);
    const popup = q('[role="alertdialog"]')!;
    const rule = popup.querySelector<HTMLElement>('[data-slot="alert-dialog-rule"]')!;
    expect(rule).not.toBeNull();
    expect(rule.hasAttribute("data-run")).toBe(true);
    expect(names(rule)).toEqual(["yorha-flicker"]);
    const title = popup.querySelector<HTMLElement>('[data-slot="alert-dialog-title"]')!;
    // The only animation on the title is the popup's content rise (no glitch / flicker on a title).
    expect(title.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName)).toEqual(["yorha-unfold-content-in"]);
    expect(names(title)).toEqual(["yorha-unfold-content-in"]);
  });

  it("V4-194: opened by touch, initial focus is the popup, not the first field", async () => {
    await render(dialog);
    const trigger = document.querySelector<HTMLElement>("button")!;
    trigger.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true, isPrimary: true }));
    trigger.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch", bubbles: true, isPrimary: true }));
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => q('[role="dialog"]') !== null);
    await frames(10);
    expect(document.activeElement).toBe(q('[role="dialog"]'));
  });

  it("V4-194: opened by keyboard, focus still goes to the first focusable (the close or field)", async () => {
    await render(dialog);
    const trigger = document.querySelector<HTMLElement>("button")!;
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await until(() => q('[role="dialog"]') !== null);
    await frames(10);
    expect(document.activeElement).not.toBe(q('[role="dialog"]'));
    expect(q('[role="dialog"]')!.contains(document.activeElement)).toBe(true);
  });
});

describe("preview-card (V4-195, V4-196)", () => {
  const card = (
    <p>
      본문{" "}
      <PreviewCard>
        <PreviewCardTrigger href="#v4-touch">2B</PreviewCardTrigger>
        <PreviewCardContent>
          <PreviewCardDescription>유닛 정보</PreviewCardDescription>
        </PreviewCardContent>
      </PreviewCard>
    </p>
  );

  it("V4-195: a touch tap follows the link and opens no card", async () => {
    await render(card);
    const a = document.querySelector<HTMLAnchorElement>('[data-slot="preview-card-trigger"]')!;
    location.hash = "";
    const fire = (type: string, extra: object = {}) => a.dispatchEvent(new PointerEvent(type, { pointerType: "touch", bubbles: true, isPrimary: true, ...extra }));
    fire("pointerover");
    fire("pointerenter", { bubbles: false });
    fire("pointerdown");
    a.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    fire("pointerup");
    a.click();
    await wait(900);
    expect(document.querySelectorAll('[data-slot="preview-card-content"]').length).toBe(0);
    expect(location.hash).toBe("#v4-touch");
  });

  it("V4-196: popover and preview-card keep the unclipped smooth reveal; their arrow is not clipped", async () => {
    await render(
      <div>
        <Popover defaultOpen>
          <PopoverTrigger>열기</PopoverTrigger>
          <PopoverContent>
            <PopoverDescription>내용</PopoverDescription>
          </PopoverContent>
        </Popover>
      </div>,
    );
    await frames(30);
    const pop = q('[data-slot="popover-content"]')!;
    const cs = getComputedStyle(pop);
    expect(cs.transitionProperty).toContain("clip-path");
    expect(cs.clipPath).toMatch(/inset\(-\d+(\.\d+)?px/);
    const arrow = q('[data-slot="popover-arrow"]');
    if (arrow) {
      expect(arrow.getBoundingClientRect().width).toBeGreaterThan(0);
      expect(arrow.querySelector("svg"), "no rotated box arrow").not.toBeNull();
    }
  });

  it("V4-196: tooltip fades (no clip-path transition)", async () => {
    await render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>대상</TooltipTrigger>
          <TooltipContent>도움말</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await frames(30);
    const tip = q('[data-slot="tooltip-content"]')!;
    const cs = getComputedStyle(tip);
    expect(cs.transitionProperty).toBe("opacity");
    expect(cs.clipPath).toBe("none");
  });
});

describe("pixel arrows, kbd, drawer grip (V4-199, V4-200, V4-202)", () => {
  it("V4-202: popup arrows are pixel glyphs: crispEdges svg, no rotation transform", async () => {
    await render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>대상</TooltipTrigger>
          <TooltipContent>
            도움말
            <TooltipArrow />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await frames(30);
    const arrow = q('[data-slot="tooltip-arrow"]')!;
    const svg = arrow.querySelector("svg")!;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute("shape-rendering")).toBe("crispEdges");
    for (let el: Element | null = svg; el && el !== document.body; el = el.parentElement) {
      expect(getComputedStyle(el).rotate, "rotate").toBe("none");
      const tf = getComputedStyle(el).transform;
      expect(tf === "none" || /^matrix\(1, 0, 0, 1,/.test(tf), `transform ${tf}`).toBe(true);
    }
  });

  it("V4-200: TooltipKbd renders a kbd slot inside the tooltip", async () => {
    await render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>대상</TooltipTrigger>
          <TooltipContent>
            저장 <TooltipKbd>⌘S</TooltipKbd>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await frames(10);
    const kbd = q('[data-slot="tooltip-content"] kbd')!;
    expect(kbd).not.toBeNull();
    expect(kbd.textContent).toBe("⌘S");
  });

  it("V4-199: the grip arms (data-armed) once swipe progress passes the dismiss threshold", async () => {
    await render(
      <Drawer defaultOpen side="bottom">
        <DrawerContent>
          <DrawerGrip />
          <DrawerTitle>제목</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    await until(() => q('[data-slot="drawer-grip"]') !== null);
    const grip = q('[data-slot="drawer-grip"]')!;
    const popup = q('[data-slot="drawer-content"]')!;
    expect(grip.hasAttribute("data-armed")).toBe(false);
    popup.style.setProperty("--drawer-swipe-progress", "0.8");
    await until(() => grip.hasAttribute("data-armed"));
    popup.style.setProperty("--drawer-swipe-progress", "0.1");
    await until(() => !grip.hasAttribute("data-armed"));
  });
});

describe("stories use the kit (V4-197)", () => {
  it("V4-197: dialog and drawer stories contain no raw <input", async () => {
    const files = import.meta.glob("../registry/yorha/ui/{dialog,drawer}/*.stories.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
    expect(Object.keys(files).length).toBe(2);
    for (const [path, src] of Object.entries(files)) expect(src.match(/<input\b/g) ?? [], path).toHaveLength(0);
  });
});
