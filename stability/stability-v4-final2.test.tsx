import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import "./mount"; // global css (tokens, utilities)
import { frames } from "./mount";
import { Meter } from "../registry/yorha/ui/meter/meter";

// v4 final polish 2: meter threshold marks are painted ticks on the cell grid, crossing the bottom frame.

const hosts: HTMLElement[] = [];
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => {
  delete document.documentElement.dataset.motion;
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
});

async function mount(node: React.ReactNode, width = 337) {
  document.documentElement.dataset.motion = "off";
  const host = document.createElement("div");
  host.style.cssText = `position:absolute;left:8px;top:8px;width:${width}px;color:#000;background:#fff;`;
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(3);
  return host;
}

describe("Meter threshold marks", () => {
  for (const size of ["md", "sm"] as const) {
    it(`${size}: ticks sit in a cell gap (right edge on a cell boundary), cross the frame, and never move layout`, async () => {
      const pitch = size === "md" ? 8 : 6;
      const bare = await mount(<Meter label="HP" value={31} max={100} size={size} />);
      const host = await mount(<Meter label="HP" value={31} max={100} low={40} critical={20} size={size} />);
      const track = host.querySelector("[data-slot=meter-track]")!.getBoundingClientRect();
      const bareTrack = bare.querySelector("[data-slot=meter-track]")!.getBoundingClientRect();
      expect(track.height).toBe(bareTrack.height);
      expect(track.width).toBe(bareTrack.width);
      const cells = host.querySelector("[data-slot=meter-cells]")!.getBoundingClientRect();
      const notches = [...host.querySelectorAll("[data-slot=meter-notch]")];
      expect(notches).toHaveLength(2);
      for (const n of notches) {
        const r = n.getBoundingClientRect();
        expect((r.right - cells.left) % pitch, "right edge on a cell boundary").toBe(0);
        expect(Number.isInteger(r.left) && Number.isInteger(r.width)).toBe(true);
        expect(r.height).toBeGreaterThanOrEqual(3);
        expect(r.bottom, "crosses the bottom frame edge").toBeGreaterThan(track.bottom);
        expect(r.top, "reaches inside the frame").toBeLessThan(track.bottom - 3);
      }
      const [low, crit] = notches.map((n) => getComputedStyle(n).backgroundColor);
      expect(low).not.toBe(crit);
    });
  }
});
