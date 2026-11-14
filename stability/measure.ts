import { cdp, userEvent } from "vitest/browser";

/**
 * State-stability helper (T21). Records getBoundingClientRect of a control root and its row on every
 * animation frame while an action runs, and reports any |dx|,|dy|,|dw|,|dh| above the tolerance.
 * Only the control root and its row are measured, so intended thumb/indicator travel inside the
 * control is not counted. Exported so later nodes can extend the same check to every item.
 */
export const TOLERANCE_PX = 0.5;
export const SAMPLE_MS = 400;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Targets {
  /** Element whose box must not change (the control root). */
  control: HTMLElement;
  /** Element whose box must not change (the row/label/list that holds it). */
  row: HTMLElement;
}

export interface Shift {
  phase: string;
  which: "control" | "row";
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export const INTERACTIVE_SELECTOR = [
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  "button[aria-pressed]",
  '[role="tab"]',
  '[role="slider"]',
  'input[type="range"]',
].join(",");

/** Own scale (transform matrix and the `scale` property) of an element; 1 when none. */
function ownScale(el: Element): { sx: number; sy: number } {
  const cs = getComputedStyle(el);
  let sx = 1;
  let sy = 1;
  if (cs.transform && cs.transform !== "none") {
    const m = new DOMMatrixReadOnly(cs.transform);
    sx *= Math.hypot(m.a, m.b) || 1;
    sy *= Math.hypot(m.c, m.d) || 1;
  }
  if (cs.scale && cs.scale !== "none") {
    const [x, y = x] = cs.scale.split(" ").map(Number);
    sx *= x || 1;
    sy *= y || 1;
  }
  return { sx, sy };
}

/**
 * Layout box: the border box with the element's own scale divided out around its centre, so a symmetric
 * press scale (yorha-press, scale 0.97) is allowed while any real layout change still shows up.
 */
const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  const { sx, sy } = ownScale(el);
  const width = r.width / sx;
  const height = r.height / sy;
  return { x: r.x + r.width / 2 - width / 2, y: r.y + r.height / 2 - height / 2, width, height };
};

/**
 * Resolve the measured boxes for an interactive element. Slider thumbs travel by design, so the slider's
 * root (role=group) is the control and its label/value header is not a row of its own: the root is the row too.
 */
export function resolveTargets(el: HTMLElement): Targets {
  if (isSliderEl(el)) {
    const root = (el.closest('[role="group"]') ?? el.closest("[data-orientation]") ?? el.parentElement!) as HTMLElement;
    return { control: root, row: root.parentElement ?? root };
  }
  const control = el;
  const row = (el.closest("label") ?? el.closest('[role="tablist"]') ?? el.parentElement ?? el) as HTMLElement;
  return { control, row };
}

const isSliderEl = (el: HTMLElement) => el.getAttribute("role") === "slider" || (el as HTMLInputElement).type === "range";

export function isDisabled(el: HTMLElement): boolean {
  return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || el.hasAttribute("data-disabled");
}

const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

/** Run `action` while sampling every frame for `ms`; returns the shifts relative to the rects taken before the action. */
export async function measure(
  phase: string,
  targets: Targets,
  action: () => Promise<void> | void,
  ms = SAMPLE_MS,
): Promise<Shift[]> {
  const base = { control: rectOf(targets.control), row: rectOf(targets.row) };
  const worst: Record<"control" | "row", Shift> = {
    control: { phase, which: "control", dx: 0, dy: 0, dw: 0, dh: 0 },
    row: { phase, which: "row", dx: 0, dy: 0, dw: 0, dh: 0 },
  };
  let running = true;
  const sample = () => {
    for (const which of ["control", "row"] as const) {
      const r = rectOf(targets[which]);
      const b = base[which];
      const w = worst[which];
      w.dx = Math.max(w.dx, Math.abs(r.x - b.x));
      w.dy = Math.max(w.dy, Math.abs(r.y - b.y));
      w.dw = Math.max(w.dw, Math.abs(r.width - b.width));
      w.dh = Math.max(w.dh, Math.abs(r.height - b.height));
    }
  };
  const loop = async () => {
    while (running) {
      sample();
      await frame();
    }
  };
  const looping = loop();
  await action();
  const end = performance.now() + ms;
  while (performance.now() < end) await frame();
  running = false;
  await looping;
  sample();
  return Object.values(worst).filter((s) => [s.dx, s.dy, s.dw, s.dh].some((v) => v > TOLERANCE_PX));
}

/** Viewport-to-page offset of the test iframe, so CDP mouse coordinates land on the element. */
function pagePoint(el: HTMLElement, dx = 0, dy = 0) {
  const r = el.getBoundingClientRect();
  const frameEl = window.frameElement as HTMLElement | null;
  const f = frameEl?.getBoundingClientRect();
  const scale = f && frameEl ? f.width / frameEl.clientWidth || 1 : 1;
  return { x: (f?.x ?? 0) + (r.x + r.width / 2 + dx) * scale, y: (f?.y ?? 0) + (r.y + r.height / 2 + dy) * scale };
}

async function mouse(type: "mouseMoved" | "mousePressed" | "mouseReleased", el: HTMLElement, dx = 0, buttons = 0) {
  const { x, y } = pagePoint(el, dx);
  await cdp().send("Input.dispatchMouseEvent", {
    type,
    x,
    y,
    button: type === "mouseMoved" ? "none" : "left",
    buttons,
    clickCount: type === "mouseMoved" ? 0 : 1,
  });
}

const park = async () => {
  await cdp().send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2, button: "none", buttons: 0 });
};

/** Keyboard key that changes the control's state: Space toggles, arrows move tab/slider/radio selection. */
function toggleKey(el: HTMLElement): string {
  const role = el.getAttribute("role");
  if (role === "tab" || isSliderEl(el)) return "{ArrowRight}";
  return " ";
}

/** Hover, pointer down, click/toggle and keyboard toggle on one control; returns every shift over the tolerance. */
export async function checkControl(el: HTMLElement): Promise<Shift[]> {
  const targets = resolveTargets(el);
  const shifts: Shift[] = [];
  const isSlider = isSliderEl(el);
  // Base UI's range input is visually hidden: pointer events go to the thumb that wraps it.
  const hit = isSlider ? el.parentElement! : el;
  const isTab = el.getAttribute("role") === "tab";
  // Slider drag: press on the thumb and move the pointer 40px; tabs: act on the neighbouring unselected tab.
  await park();
  await frame();
  shifts.push(...(await measure("hover", targets, () => mouse("mouseMoved", hit))));
  shifts.push(...(await measure("pointer-down", targets, () => mouse("mousePressed", hit, 0, 1))));
  if (isSlider) {
    shifts.push(...(await measure("drag", targets, async () => {
      for (let i = 1; i <= 8; i++) {
        await mouse("mouseMoved", hit, i * 5, 1);
        await frame();
      }
    })));
    shifts.push(...(await measure("release", targets, () => mouse("mouseReleased", hit, 40, 0))));
  } else {
    shifts.push(...(await measure("click-release", targets, () => mouse("mouseReleased", hit, 0, 0))));
  }
  await park();
  await frame();
  el.focus();
  shifts.push(...(await measure("keyboard", targets, () => userEvent.keyboard(toggleKey(el)))));
  return shifts;
}

export const fmt = (s: Shift[]) => s.map((x) => `${x.phase}/${x.which}: dx${x.dx.toFixed(2)} dy${x.dy.toFixed(2)} dw${x.dw.toFixed(2)} dh${x.dh.toFixed(2)}`).join("; ");
