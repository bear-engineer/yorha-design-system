/** Options of `runFx`. */
export interface RunFxOptions {
  /** Extra lockout in ms. The floor of 1000 cannot be lowered (WCAG 2.3.1: no more than three flashes per second). */
  lockoutMs?: number;
}

const FLOOR_MS = 1000;
const lastRun = new WeakMap<HTMLElement, number>();

/**
 * Plays a one-shot motion utility (`yorha-glitch`, `yorha-flicker`) on an element that stays mounted: sets `data-run`, waits for every
 * animation on the element and its pseudo-elements to settle, then removes the attribute. Returns false and does nothing when `el`
 * is empty or the last run on this element started less than max(1000, lockoutMs) ms ago.
 * Under data-motion=off no animation starts, so the attribute is removed in the same task.
 */
export function runFx(el: HTMLElement | null | undefined, opts: RunFxOptions = {}): boolean {
  if (!el) return false;
  const lockout = Math.max(FLOOR_MS, opts.lockoutMs ?? 0);
  const now = performance.now();
  const last = lastRun.get(el);
  if (last !== undefined && now - last < lockout) return false;
  lastRun.set(el, now);
  el.setAttribute("data-run", "");
  const animations = el.getAnimations({ subtree: true });
  if (animations.length === 0) {
    el.removeAttribute("data-run");
    return true;
  }
  void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => el.removeAttribute("data-run"));
  return true;
}
