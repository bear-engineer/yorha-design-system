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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from "../registry/yorha/ui/alert-dialog/alert-dialog";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "../registry/yorha/ui/dialog/dialog";
import { Drawer, DrawerBody, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerGrip, DrawerTitle, DrawerTrigger } from "../registry/yorha/ui/drawer/drawer";
import { PreviewCard, PreviewCardContent, PreviewCardDescription, PreviewCardTrigger } from "../registry/yorha/ui/preview-card/preview-card";
import { ToastProvider, createToastManager } from "../registry/yorha/ui/toast/toast";
import { expectWithinViewport, expectPixelSnapped } from "../.storybook/geometry";

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

const LONG = Array.from({ length: 60 }, (_, i) => <p key={i}>기록 {i + 1}: 유닛 상태를 점검한다.</p>);
const px = (v: string) => parseFloat(v);

function LongDialog({ alert = false }: { alert?: boolean }) {
  return alert ? (
    <AlertDialog defaultOpen>
      <AlertDialogTrigger>열기</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>긴 경고</AlertDialogTitle>
        <AlertDialogDescription>{LONG}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction variant="danger">삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : (
    <Dialog defaultOpen>
      <DialogTrigger>열기</DialogTrigger>
      <DialogContent>
        <DialogTitle>긴 내용</DialogTitle>
        <DialogBody>
          <DialogDescription>{LONG}</DialogDescription>
        </DialogBody>
        <DialogFooter>
          <DialogClose>취소</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("dialog and alert-dialog (FOVL-03, 05, 12, 17, 18, 20)", () => {
  it("FOVL-03: long content scrolls inside the body; title and footer stay put", async () => {
    await render(<LongDialog />);
    await until(() => !!q('[role="dialog"]'));
    await frames(8);
    const popup = q('[role="dialog"]')!;
    const body = popup.querySelector<HTMLElement>('[data-slot="dialog-body"]')!;
    expect(getComputedStyle(popup).overflowY).toBe("hidden");
    expect(popup.getBoundingClientRect().height).toBeLessThanOrEqual(window.innerHeight - 32 + 0.5);
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    const title = popup.querySelector<HTMLElement>('[data-slot="dialog-title"]')!;
    const footer = popup.querySelector<HTMLElement>('[data-slot="dialog-footer"]')!;
    const before = title.getBoundingClientRect().top;
    body.scrollTop = 400;
    await frames(2);
    expect(title.getBoundingClientRect().top).toBe(before);
    expect(title.getBoundingClientRect().top).toBeCloseTo(popup.getBoundingClientRect().top + 1, 0);
    expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(popup.getBoundingClientRect().bottom);
    expect(getComputedStyle(body).overscrollBehaviorY).toBe("contain");
  });

  it("FOVL-03: alert-dialog long description scrolls inside, footer visible", async () => {
    await render(<LongDialog alert />);
    await until(() => !!q('[role="alertdialog"]'));
    await frames(8);
    const popup = q('[role="alertdialog"]')!;
    const desc = popup.querySelector<HTMLElement>('[data-slot="alert-dialog-description"]')!;
    expect(getComputedStyle(popup).overflowY).toBe("hidden");
    expect(desc.scrollHeight).toBeGreaterThan(desc.clientHeight);
    const footer = popup.querySelector<HTMLElement>('[data-slot="alert-dialog-footer"]')!;
    expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(popup.getBoundingClientRect().bottom);
  });

  it("FOVL-05: title, body and footer share one inline inset", async () => {
    await render(<LongDialog />);
    await until(() => !!q('[role="dialog"]'));
    await frames(8);
    const pad = (slot: string) => px(getComputedStyle(q(`[data-slot="dialog-${slot}"]`)!).paddingLeft);
    expect(pad("title")).toBe(pad("body"));
    expect(pad("footer")).toBe(pad("body"));
    const right = (slot: string) => px(getComputedStyle(q(`[data-slot="dialog-${slot}"]`)!).paddingRight);
    expect(right("footer")).toBe(right("body"));
  });

  it("FOVL-12: a close button sits at the right end of the title strip, >= 24px, and returns focus to the trigger", async () => {
    await render(
      <Dialog>
        <DialogTrigger>열기</DialogTrigger>
        <DialogContent>
          <DialogTitle>유닛 정보</DialogTitle>
          <DialogBody>
            <DialogDescription>내용</DialogDescription>
          </DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const trigger = q('button:not([data-slot="dialog-close-button"])')!;
    await userEvent.click(trigger);
    await until(() => !!q('[role="dialog"]'));
    await frames(8);
    const close = q('[data-slot="dialog-close-button"]')!;
    expect(close.getAttribute("aria-label")).toBe("닫기");
    const r = close.getBoundingClientRect();
    expect(r.width).toBeGreaterThanOrEqual(24);
    const title = q('[data-slot="dialog-title"]')!.getBoundingClientRect();
    expect(r.right).toBeCloseTo(title.right, 0);
    expect(r.top).toBeCloseTo(title.top, 0);
    expect(r.height).toBeCloseTo(title.height, 0);
    await userEvent.click(close);
    await until(() => !q('[role="dialog"]'));
    expect(document.activeElement).toBe(trigger);
  });

  it("FOVL-12: closeButton={false} removes it", async () => {
    await render(
      <Dialog defaultOpen>
        <DialogContent closeButton={false}>
          <DialogTitle>유닛 정보</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await until(() => !!q('[role="dialog"]'));
    expect(q('[data-slot="dialog-close-button"]')).toBeNull();
  });

  it("FOVL-18: popup top and height are whole pixels (top-anchored, no fractional centring)", async () => {
    await render(<LongDialog />);
    await until(() => !!q('[role="dialog"]'));
    await frames(8);
    expectPixelSnapped(q('[role="dialog"]')!, { axes: "y" });
    const short = await render(
      <Dialog defaultOpen>
        <DialogContent closeButton={false}>
          <DialogTitle>짧은 대화상자</DialogTitle>
          <DialogBody>
            <DialogDescription>한 줄 설명.</DialogDescription>
          </DialogBody>
          <DialogFooter>
            <DialogClose>닫기</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    void short;
    await frames(8);
    const popups = [...document.querySelectorAll('[role="dialog"]')];
    for (const p of popups) expectPixelSnapped(p, { axes: "y" });
  });

  it("FOVL-17: modal enter uses the 280ms modal token on popup and backdrop", async () => {
    await render(<LongDialog />);
    await until(() => !!q('[role="dialog"]'));
    expect(getComputedStyle(document.documentElement).getPropertyValue("--motion-modal").trim()).toBe("280ms");
    const d = getComputedStyle(q('[role="dialog"]')!).getPropertyValue("--motion-panel").trim();
    expect(d).toBe("280ms");
  });

  it("FOVL-20: AlertDialogAction variant danger is an alert-coloured Button", async () => {
    await render(<LongDialog alert />);
    await until(() => !!q('[role="alertdialog"]'));
    await frames(6);
    const buttons = [...document.querySelectorAll<HTMLElement>('[role="alertdialog"] [data-slot="alert-dialog-footer"] button')];
    expect(buttons).toHaveLength(2);
    const [cancel, action] = buttons as [HTMLElement, HTMLElement];
    expectSameHeight(cancel, action);
    expect(getComputedStyle(action).borderTopColor).not.toBe(getComputedStyle(cancel).borderTopColor);
    expect(action.getAttribute("data-variant")).toBe("danger");
  });
});

describe("drawer (FOVL-06, 07, 08, 09)", () => {
  const bottom = (props: Record<string, unknown> = {}) => (
    <Drawer side="bottom" defaultOpen {...props}>
      <DrawerTrigger>열기</DrawerTrigger>
      <DrawerContent>
        <DrawerGrip />
        <DrawerTitle>유닛 목록</DrawerTitle>
        <DrawerBody>
          <DrawerDescription>격납고 유닛.</DrawerDescription>
        </DrawerBody>
        <DrawerFooter>
          <DrawerClose>닫기</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );

  it("FOVL-06: grip is centred inside the ink strip and clear of the title text, grab cursor", async () => {
    await render(bottom());
    await until(() => !!q('[role="dialog"]'));
    await frames(30);
    const popup = q('[role="dialog"]')!.getBoundingClientRect();
    const gripBand = q('[data-slot="drawer-grip"]')!;
    const bar = gripBand.getBoundingClientRect();
    const title = q('[data-slot="drawer-title"]')!;
    expect(bar.left + bar.width / 2).toBeCloseTo(popup.left + popup.width / 2, 0);
    const barStyle = getComputedStyle(gripBand, "::before");
    expect(px(barStyle.height)).toBe(4);
    expect(px(barStyle.width)).toBe(40);
    expect(getComputedStyle(gripBand).backgroundColor).toBe(getComputedStyle(title).backgroundColor);
    expect(bar.top).toBeGreaterThanOrEqual(popup.top);
    const titleTextTop = title.getBoundingClientRect().top + (title.getBoundingClientRect().height - 20) / 2;
    expect(titleTextTop - (bar.top + bar.height / 2 + 2)).toBeGreaterThanOrEqual(8);
    expect(getComputedStyle(gripBand).cursor).toBe("grab");
  });

  it("FOVL-07: the scrim is never fully transparent while open at the first snap point", async () => {
    await render(bottom({ snapPoints: ["240px", 1] }));
    await until(() => !!q('[data-slot="drawer-backdrop"]'));
    await frames(40);
    expect(Number(getComputedStyle(q('[data-slot="drawer-backdrop"]')!).opacity)).toBeGreaterThanOrEqual(0.5);
  });

  it("FOVL-08: exit is faster than enter and the scrim leaves with the sheet", async () => {
    await render(bottom());
    await until(() => !!q('[role="dialog"]'));
    await frames(30);
    const popup = q('[role="dialog"]')!;
    const backdrop = q('[data-slot="drawer-backdrop"]')!;
    const ms = (el: Element) => Math.max(...getComputedStyle(el).transitionDuration.split(",").map((v) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000)));
    const enter = ms(popup);
    await userEvent.click(q('[data-slot="drawer-close"]')!);
    await until(() => popup.hasAttribute("data-ending-style") || !popup.isConnected, 1500).catch(() => undefined);
    if (popup.isConnected && popup.hasAttribute("data-ending-style")) {
      const out = ms(popup);
      expect(out).toBeLessThan(enter);
      expect(ms(backdrop)).toBe(out);
    } else {
      throw new Error("drawer left without an observable ending style");
    }
  });

  it("FOVL-09: an edge sheet has no offset shadow; its inner edge is a 2px ink border", async () => {
    await render(bottom());
    await until(() => !!q('[role="dialog"]'));
    await frames(30);
    const cs = getComputedStyle(q('[role="dialog"]')!);
    // `shadow-none` computes to transparent zero-size layers; nothing visible may remain
    expect(cs.boxShadow.replace(/rgba\(0, 0, 0, 0\) 0px 0px 0px 0px( inset)?(, )?/g, "").trim() || "none").toBe("none");
    expect(px(cs.borderTopWidth)).toBe(2);
    const probe = document.createElement("div");
    probe.className = "bg-yorha-ink";
    document.body.append(probe);
    const ink = getComputedStyle(probe).backgroundColor;
    probe.remove();
    expect(cs.borderTopColor).toBe(ink);
  });
});

describe("toast (FOVL-01, 02, 16)", () => {
  async function toasts(types: ("alert" | "success" | "info")[]) {
    const manager = createToastManager();
    const c = await render(<ToastProvider toastManager={manager} timeout={0} />);
    for (const type of types) manager.add({ title: "알림 제목", description: "설명 문장이다.", type });
    await until(() => document.querySelectorAll('[data-slot="toast"]').length === types.length);
    await frames(30);
    return c;
  }
  const all = () => [...document.querySelectorAll<HTMLElement>('[data-slot="toast"]')];

  it("FOVL-01: titles start at the same x for every toast type", async () => {
    await toasts(["alert", "success", "info"]);
    // expanded, so no toast is scaled (a scaled rear toast shifts every x inside it)
    await userEvent.hover(all()[0]!);
    await frames(40);
    const offsets = all().map((t) => t.querySelector('[data-slot="toast-title"], [id]')!.getBoundingClientRect().left - t.getBoundingClientRect().left);
    expect(offsets).toHaveLength(3);
    for (const o of offsets) expect(Math.abs(o - offsets[0]!)).toBeLessThanOrEqual(0.5);
    for (const t of all()) expect(px(getComputedStyle(t).borderLeftWidth)).toBe(1);
  });

  it("FOVL-02: close is centred on the title row, a real icon, >= 24px", async () => {
    await toasts(["info"]);
    const t = all()[0]!;
    const close = t.querySelector<HTMLElement>('button[aria-label="닫기"]')!;
    const title = t.querySelector<HTMLElement>('[data-slot="toast-title"]')!;
    const cr = close.getBoundingClientRect();
    const tr = title.getBoundingClientRect();
    expect(Math.abs(cr.top + cr.height / 2 - (tr.top + tr.height / 2))).toBeLessThanOrEqual(1);
    expect(cr.width).toBeGreaterThanOrEqual(24);
    expect(close.querySelector("svg")).not.toBeNull();
    expect(close.textContent?.trim()).toBe("");
  });

  it("FOVL-16: stacked toasts peek at rest and spread to their own heights when expanded", async () => {
    await toasts(["info", "success", "alert"]);
    const list = all();
    // newest is index 0 (front): Base UI orders newest first
    const tops = list.map((t) => t.getBoundingClientRect().top);
    const front = Math.max(...tops);
    const frontToast = list[tops.indexOf(front)]!;
    const spread = (arr: number[]) => Math.max(...arr) - Math.min(...arr);
    expect(spread(tops)).toBeLessThan(2 * 20);
    for (const t of list) expect(t.getBoundingClientRect().height).toBeLessThanOrEqual(frontToast.getBoundingClientRect().height + 1);
    const viewport = document.querySelector<HTMLElement>('[data-slot="toast-viewport"]')!;
    viewport.dispatchEvent(new PointerEvent("pointerenter", { bubbles: false }));
    viewport.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await userEvent.hover(frontToast);
    await frames(40);
    const expanded = all().map((t) => t.getBoundingClientRect().top);
    expect(spread(expanded)).toBeGreaterThanOrEqual(frontToast.getBoundingClientRect().height);
  });
});

describe("preview-card (FOVL-13, 14)", () => {
  it("FOVL-13: the trigger has horizontal padding cancelled by margin, so opening never moves it", async () => {
    const c = await render(
      <p>
        본문 <PreviewCard>
          <PreviewCardTrigger href="#a">2B</PreviewCardTrigger>
          <PreviewCardContent>
            <PreviewCardDescription>유닛 정보</PreviewCardDescription>
          </PreviewCardContent>
        </PreviewCard> 이어지는 문장.
      </p>,
    );
    const a = q('[data-slot="preview-card-trigger"]', c)!;
    const cs = getComputedStyle(a);
    expect(px(cs.paddingLeft)).toBe(4);
    expect(px(cs.marginLeft)).toBe(-4);
    expect(cs.getPropertyValue("-webkit-box-decoration-break") || cs.getPropertyValue("box-decoration-break")).toBe("clone");
  });

  it("FOVL-14: a card opened from the right viewport edge stays inside the viewport", async () => {
    await render(
      <div style={{ position: "fixed", right: 0, top: 120 }}>
        <PreviewCard defaultOpen>
          <PreviewCardTrigger href="#a">오른쪽 끝 링크</PreviewCardTrigger>
          <PreviewCardContent>
            <PreviewCardDescription>유닛 정보 카드의 본문이다.</PreviewCardDescription>
          </PreviewCardContent>
        </PreviewCard>
      </div>,
    );
    await until(() => !!q('[data-slot="preview-card-content"]'));
    await frames(30);
    expectWithinViewport(q('[data-slot="preview-card-content"]')!, 8);
    expect(getComputedStyle(q('[data-slot="preview-card-content"]')!).maxWidth).toBe("320px");
  });
});
