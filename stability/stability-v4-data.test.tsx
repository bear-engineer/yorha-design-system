import * as React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // global css (tokens, utilities, storybook annotations)
import { frames } from "./mount";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableCol,
  DataTableColgroup,
  DataTableEmpty,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
  DataTableRowHeader,
  DataTableSelectAll,
  DataTableSelectCell,
  type SortDirection,
} from "../registry/yorha/ui/data-table/data-table";
import { Progress } from "../registry/yorha/ui/progress/progress";
import { Meter } from "../registry/yorha/ui/meter/meter";
import { Card } from "../registry/yorha/ui/card/card";
import { Avatar, AvatarFallback, AvatarGroup, AvatarStatus } from "../registry/yorha/ui/avatar/avatar";

// v4 f-data (V4-210..221): geometry / computed-style assertions, measured after finite animations settle.

const roots: ReturnType<typeof createRoot>[] = [];
const hosts: HTMLElement[] = [];
afterEach(() => {
  delete document.documentElement.dataset.motion;
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rect = (el: Element) => el.getBoundingClientRect();
const key = (el: Element) => {
  const b = rect(el);
  return `${b.left}/${b.top}/${b.width}/${b.height}`;
};

async function mount(node: React.ReactNode, { motion = "off", width = 480 } = {}) {
  document.documentElement.dataset.motion = motion;
  const host = document.createElement("div");
  host.style.cssText = `position:absolute;left:8px;top:8px;width:${width}px;color:#000;background:#fff;`;
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(3);
  return {
    host,
    rerender: async (n: React.ReactNode) => {
      flushSync(() => root.render(n));
      await frames(2);
    },
  };
}

const ROWS = [
  ["Alpha", "12"],
  ["Beta", "7"],
  ["Gamma", "31"],
];

function Table({ selected = [] as number[], loading = false, children = null as React.ReactNode, ...rest }) {
  return (
    <DataTable caption="Units" {...rest}>
      <DataTableHeader>
        <tr>
          <DataTableSelectAll label="Select all" checked={selected.length === ROWS.length} indeterminate={selected.length > 0 && selected.length < ROWS.length} onCheckedChange={() => {}} />
          <DataTableHeadCell>Name</DataTableHeadCell>
          <DataTableHeadCell numeric>Count</DataTableHeadCell>
        </tr>
      </DataTableHeader>
      <DataTableBody loading={loading} loadingRows={3} loadingColumns={3} stream={false}>
        {children ??
          ROWS.map(([n, c], i) => (
            <DataTableRow key={n} data-selected={selected.includes(i) ? "" : undefined}>
              <DataTableSelectCell label={`Select ${n}`} checked={selected.includes(i)} onCheckedChange={() => {}} />
              <DataTableCell>{n}</DataTableCell>
              <DataTableCell numeric>{c}</DataTableCell>
            </DataTableRow>
          ))}
      </DataTableBody>
    </DataTable>
  );
}

describe("V4-210 DataTable selection", () => {
  it("labelled checkboxes in a fixed first column; selecting keeps table and row rects; no aria-selected on rows", async () => {
    const { host, rerender } = await mount(<Table />);
    const boxes = host.querySelectorAll<HTMLElement>("tbody tr > td:first-child [role=checkbox]");
    expect(boxes.length).toBe(3);
    expect(boxes[0]!.closest("label")!.textContent).toContain("Select Alpha");
    expect(host.querySelector("thead [role=checkbox]")!.closest("label")!.textContent).toContain("Select all");
    const before = [key(host.querySelector("table")!), ...[...host.querySelectorAll("tbody tr")].map(key)];
    const w0 = rect(host.querySelector("tbody td")!).width;
    await rerender(<Table selected={[0, 1]} />);
    const after = [key(host.querySelector("table")!), ...[...host.querySelectorAll("tbody tr")].map(key)];
    expect(after).toEqual(before);
    expect(rect(host.querySelector("tbody td")!).width).toBe(w0);
    const row = host.querySelector("tbody tr")!;
    expect(row.hasAttribute("data-selected")).toBe(true);
    expect(row.hasAttribute("aria-selected")).toBe(false);
    expect(getComputedStyle(row).backgroundColor).not.toBe(getComputedStyle(host.querySelectorAll("tbody tr")[2]!).backgroundColor);
    expect(host.querySelector("thead [role=checkbox]")!.getAttribute("aria-checked")).toBe("mixed");
  });
});

describe("V4-211 empty / loading / truncate", () => {
  it("loading rows have the loaded row height; empty is a colSpan row", async () => {
    const { host, rerender } = await mount(<Table />);
    const loaded = [...host.querySelectorAll("tbody tr")].map((r) => rect(r).height);
    await rerender(<Table loading />);
    const rows = [...host.querySelectorAll("tbody tr")];
    expect(rows.length).toBe(3);
    expect(rows.map((r) => rect(r).height)).toEqual(loaded);
    expect(host.querySelector("tbody")!.getAttribute("aria-busy")).toBe("true");
    await rerender(
      <Table>
        <DataTableEmpty colSpan={3}>Nothing here</DataTableEmpty>
      </Table>,
    );
    const td = host.querySelector("tbody td")!;
    expect(td.getAttribute("colspan")).toBe("3");
    expect(Math.round(rect(td).width)).toBe(Math.round(rect(host.querySelector("table")!).width));
  });

  it("truncate cell clips to one line with a title", async () => {
    const long = "L".repeat(200);
    const { host } = await mount(
      <Table>
        <DataTableRow>
          <DataTableCell>x</DataTableCell>
          <DataTableCell truncate>{long}</DataTableCell>
          <DataTableCell numeric>1</DataTableCell>
        </DataTableRow>
      </Table>,
    );
    const td = host.querySelectorAll("tbody td")[1]!;
    expect(td.getAttribute("title")).toBe(long);
    expect(getComputedStyle(td).textOverflow).toBe("ellipsis");
    expect(rect(host.querySelector("table")!).width).toBeLessThanOrEqual(480);
  });
});

describe("V4-212 row header and scroll region", () => {
  it("DataTableRowHeader is th[scope=row]", async () => {
    const { host } = await mount(
      <Table>
        <DataTableRow>
          <DataTableCell>x</DataTableCell>
          <DataTableRowHeader>Alpha</DataTableRowHeader>
          <DataTableCell numeric>1</DataTableCell>
        </DataTableRow>
      </Table>,
    );
    expect(host.querySelector("tbody th")!.getAttribute("scope")).toBe("row");
  });

  it("scroll wrapper is a focusable labelled region only while it overflows", async () => {
    const wide = (
      <DataTable caption="Wide">
        <DataTableBody>
          <DataTableRow>
            <DataTableCell className="min-w-[600px]">a</DataTableCell>
          </DataTableRow>
        </DataTableBody>
      </DataTable>
    );
    const fits = await mount(<Table />, { width: 480 });
    const w1 = fits.host.querySelector("[data-slot=data-table-wrapper]")!;
    expect(w1.getAttribute("tabindex")).toBeNull();
    expect(w1.getAttribute("role")).toBeNull();
    const over = await mount(wide, { width: 300 });
    await wait(100);
    const w2 = over.host.querySelector("[data-slot=data-table-wrapper]")!;
    expect(w2.getAttribute("tabindex")).toBe("0");
    expect(w2.getAttribute("role")).toBe("region");
    expect(document.getElementById(w2.getAttribute("aria-labelledby")!)!.textContent).toBe("Wide");
  });
});

describe("V4-213 / 215 sort", () => {
  function Sortable({ three = false }: { three?: boolean }) {
    const [dir, setDir] = React.useState<SortDirection>("none");
    return (
      <DataTable caption="Sortable">
        <DataTableHeader>
          <tr>
            <DataTableHeadCell sortable sortDirection={dir} onSortChange={setDir} sortCycle={three ? "three" : "two"}>
              Name
            </DataTableHeadCell>
          </tr>
        </DataTableHeader>
        <DataTableBody stream={false}>
          <DataTableRow>
            <DataTableCell>a</DataTableCell>
          </DataTableRow>
        </DataTableBody>
      </DataTable>
    );
  }

  it("announces the sort in a visually hidden polite status", async () => {
    const { host } = await mount(<Sortable />);
    const status = host.querySelector<HTMLElement>("[data-slot=data-table-status]")!;
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe("");
    await userEvent.click(host.querySelector("th button")!);
    await frames(2);
    expect(status.textContent).toContain("Name");
    expect(status.textContent).toMatch(/오름차순/);
    expect(rect(status).width).toBeLessThanOrEqual(1);
  });

  it("three-state cycle returns to none; sorted header has a static 2px under-rule", async () => {
    const { host } = await mount(<Sortable three />);
    const th = host.querySelector("th")!;
    const btn = host.querySelector("th button")!;
    await userEvent.click(btn);
    expect(th.getAttribute("aria-sort")).toBe("ascending");
    expect(getComputedStyle(th).boxShadow).toMatch(/inset/);
    expect(getComputedStyle(th).boxShadow).toMatch(/2px/);
    await userEvent.click(btn);
    expect(th.getAttribute("aria-sort")).toBe("descending");
    await userEvent.click(btn);
    expect(th.getAttribute("aria-sort")).toBe("none");
  });

  it("sticky header option pins th", async () => {
    const { host } = await mount(
      <DataTable caption="S" stickyHeader>
        <DataTableHeader>
          <tr>
            <DataTableHeadCell>H</DataTableHeadCell>
          </tr>
        </DataTableHeader>
        <DataTableBody stream={false} />
      </DataTable>,
    );
    expect(getComputedStyle(host.querySelector("th")!).position).toBe("sticky");
  });
});

describe("V4-216 column resize", () => {
  it("separator on the head cell resizes the <col> by keyboard", async () => {
    const { host } = await mount(
      <DataTable caption="R" resizable>
        <DataTableColgroup>
          <DataTableCol style={{ width: 160 }} />
          <DataTableCol />
        </DataTableColgroup>
        <DataTableHeader>
          <tr>
            <DataTableHeadCell resizable>A</DataTableHeadCell>
            <DataTableHeadCell>B</DataTableHeadCell>
          </tr>
        </DataTableHeader>
        <DataTableBody stream={false}>
          <DataTableRow>
            <DataTableCell>1</DataTableCell>
            <DataTableCell>2</DataTableCell>
          </DataTableRow>
        </DataTableBody>
      </DataTable>,
    );
    const sep = host.querySelector<HTMLElement>("th [role=separator]")!;
    expect(sep.getAttribute("aria-orientation")).toBe("vertical");
    expect(sep.getAttribute("tabindex")).toBe("0");
    expect(rect(sep).width).toBeGreaterThanOrEqual(24);
    const w0 = rect(host.querySelector("th")!).width;
    sep.focus();
    await userEvent.keyboard("{ArrowRight}");
    await frames(2);
    const col = host.querySelector<HTMLElement>("col")!;
    expect(parseFloat(col.style.width)).toBe(w0 + 8);
    expect(rect(host.querySelector("th")!).width).toBe(w0 + 8);
    expect(sep.getAttribute("aria-valuenow")).toBe(String(w0 + 8));
    await userEvent.keyboard("{Home}");
    expect(parseFloat(col.style.width)).toBe(Number(sep.getAttribute("aria-valuemin")));
  });
});

describe("V4-221 stream", () => {
  it("body cells stream in full motion, never under off; layout untouched", async () => {
    const node = (
      <DataTable caption="S">
        <DataTableBody>
          <DataTableRow>
            <DataTableCell>a</DataTableCell>
          </DataTableRow>
        </DataTableBody>
      </DataTable>
    );
    const full = await mount(node, { motion: "full" });
    const td = full.host.querySelector("tbody td")!;
    expect(getComputedStyle(td).animationName).toContain("yorha-stream-clip");
    const off = await mount(node, { motion: "off" });
    expect(getComputedStyle(off.host.querySelector("tbody td")!).animationName === "none" || getComputedStyle(off.host.querySelector("tbody td")!).animationDuration === "0s").toBe(true);
  });
});

describe("V4-214 / 217 Progress", () => {
  it("indeterminate sweep is eased with --yorha-step-loop (steps)", async () => {
    const { host } = await mount(<Progress label="Busy" value={null} />, { motion: "full" });
    const ind = host.querySelector<HTMLElement>("[data-yorha-sweep]")!;
    const anim = ind.getAnimations()[0]!;
    const timing = anim.effect!.getTiming();
    expect(String(timing.easing)).toBe(getComputedStyle(document.documentElement).getPropertyValue("--yorha-step-loop").trim());
    expect(String(timing.easing)).toMatch(/^steps\(/);
  });

  it("determinate advance is a 180 ms stepped clip; formatValue feeds aria-valuetext", async () => {
    const fmt = (v: number | null) => (v === null ? "busy" : `${v} of 100 sent`);
    const { host, rerender } = await mount(<Progress label="Send" value={20} formatValue={fmt} />, { motion: "full" });
    const bar = host.querySelector("[role=progressbar]")!;
    expect(bar.getAttribute("aria-valuetext")).toBe("20 of 100 sent");
    await wait(300);
    await rerender(<Progress label="Send" value={60} formatValue={fmt} />);
    const ind = host.querySelector<HTMLElement>("[data-slot=progress-fill], [role=progressbar] [data-value], [role=progressbar] div > div")!;
    const anims = host.querySelectorAll("[role=progressbar] *");
    const running = [...anims].flatMap((e) => e.getAnimations()).find((a) => (a.effect as KeyframeEffect).getKeyframes().some((k) => "clipPath" in k));
    expect(running, "clip-path animation").toBeTruthy();
    expect(running!.effect!.getTiming().duration).toBe(180);
    expect(String(running!.effect!.getTiming().easing)).toMatch(/^steps\(/);
    expect(ind).toBeTruthy();
    expect(bar.getAttribute("aria-valuetext")).toBe("60 of 100 sent");
  });

  it("off mode advances without animation", async () => {
    const { host, rerender } = await mount(<Progress label="Send" value={20} />, { motion: "off" });
    await rerender(<Progress label="Send" value={60} />);
    const all = [...host.querySelectorAll("[role=progressbar] *")].flatMap((e) => e.getAnimations());
    expect(all.length).toBe(0);
  });
});

describe("V4-218 dots variant", () => {
  const dots = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-slot=dots-fill]")!;

  it("Progress dots: 4px-quantised fill with a 4px mask pitch, ghost track", async () => {
    const { host } = await mount(<Progress label="P" value={37} variant="dots" />);
    const fill = dots(host);
    expect(getComputedStyle(fill).maskImage).toContain("url(");
    expect(getComputedStyle(fill).maskSize).toBe("4px 4px");
    expect(rect(fill).width % 4).toBe(0);
    expect(rect(fill).height).toBe(10);
    expect(host.querySelector("[data-slot=dots-ghost]")).toBeTruthy();
  });

  it("Meter dots: low / critical are sparse columns (wider mask pitch), differ by shape not colour alone", async () => {
    const ok = await mount(<Meter label="HP" value={80} variant="dots" low={30} critical={10} />);
    const low = await mount(<Meter label="HP" value={25} variant="dots" low={30} critical={10} />);
    const crit = await mount(<Meter label="HP" value={5} variant="dots" low={30} critical={10} />);
    const pitch = (h: HTMLElement) => parseFloat(getComputedStyle(dots(h)).maskSize);
    expect(pitch(ok.host)).toBe(4);
    expect(pitch(low.host)).toBe(8);
    expect(pitch(crit.host)).toBeGreaterThan(8);
  });
});

describe("V4-219 Card selected", () => {
  it("corner mark swaps in place; interactive cards are aria-pressed toggles; rect equal", async () => {
    const make = (selected: boolean) => <Card title="Unit" selected={selected} onSelectedChange={() => {}} meta="m" />;
    const { host, rerender } = await mount(make(false));
    const card = host.querySelector("article")!;
    const before = key(card);
    const btn = host.querySelector("button[aria-pressed]")!;
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    const mark = host.querySelector<HTMLElement>("[data-slot=card-mark]")!;
    expect(getComputedStyle(mark).opacity).toBe("0");
    await rerender(make(true));
    await wait(250);
    expect(host.querySelector("button[aria-pressed]")!.getAttribute("aria-pressed")).toBe("true");
    expect(getComputedStyle(mark).opacity).toBe("1");
    expect(key(card)).toBe(before);
    expect(card.hasAttribute("data-selected")).toBe(true);
  });

  it("static selected (no handler) has no button and no aria-pressed", async () => {
    const { host } = await mount(<Card title="Unit" selected />);
    expect(host.querySelector("[aria-pressed]")).toBeNull();
    expect(host.querySelector("[data-slot=card-mark]")).toBeTruthy();
  });
});

describe("V4-220 Avatar status and group", () => {
  it("AvatarStatus is an 8 px mark by shape (distinct per status) with a name", async () => {
    const shapes = new Set<string>();
    for (const status of ["online", "away", "busy", "offline"] as const) {
      const { host } = await mount(
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
          <AvatarStatus status={status} />
        </Avatar>,
      );
      const mark = host.querySelector<HTMLElement>("[data-slot=avatar-status]")!;
      expect(mark.getAttribute("role")).toBe("img");
      expect(mark.getAttribute("aria-label")).toBeTruthy();
      const svg = mark.querySelector("svg")!;
      shapes.add(svg.getAttribute("data-glyph")!);
      expect(rect(svg).width % 1).toBe(0);
      expect(rect(mark).right).toBeLessThanOrEqual(rect(host.querySelector("[data-slot=avatar]")!).right);
    }
    expect(shapes.size).toBe(4);
  });

  it("AvatarGroup collapses to max + '+N' and overlaps by a hairline", async () => {
    const { host } = await mount(
      <AvatarGroup max={2} size="sm" label="Team">
        {["A", "B", "C", "D"].map((n) => (
          <Avatar key={n}>
            <AvatarFallback>{n}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>,
    );
    const avatars = host.querySelectorAll("[data-slot=avatar]");
    expect(avatars.length).toBe(3);
    expect(avatars[2]!.textContent).toBe("+2");
    expect(host.querySelector("[role=group]")!.getAttribute("aria-label")).toBe("Team");
    expect(rect(avatars[1]!).left - rect(avatars[0]!).right).toBe(-1);
    expect(rect(avatars[0]!).width).toBe(32);
  });
});
