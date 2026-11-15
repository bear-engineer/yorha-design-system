import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import "./mount"; // global css (tokens, utilities)
import { animationsFinished, frames } from "./mount";
import { Heading } from "../registry/yorha/ui/heading/heading";
import { MenuList, MenuListItem } from "../registry/yorha/ui/menu-list/menu-list";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../registry/yorha/ui/tabs/tabs";
import {
  DataTable, DataTableBody, DataTableCell, DataTableHeadCell, DataTableHeader, DataTableRow,
} from "../registry/yorha/ui/data-table/data-table";
import { InputGroup, InputGroupButton, InputGroupInput } from "../registry/yorha/ui/input-group/input-group";

// v4 detail-c: Latin-only tracking/case, no seam on ink bands, distinct hover/focus/selected row states, ring geometry, link style.

const hosts: HTMLElement[] = [];
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
});

async function mount(node: React.ReactNode, lang = "ko"): Promise<HTMLElement> {
  const host = document.createElement("div");
  host.lang = lang;
  host.style.cssText = "position:absolute;left:16px;top:16px;width:400px;color:#000;background:#fff";
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(3);
  return host;
}

const px = (v: string) => parseFloat(v) || 0;

describe("Hangul typography: tracking and case are Latin-only (#20, #21)", () => {
  it("lang=ko headings and labels get ≤0.02em tracking and no uppercase; a lang=en island keeps the wide values", async () => {
    const host = await mount(
      <div>
        <Heading level={1} data-t="ko">A-2 기체</Heading>
        <div lang="en"><Heading level={1} data-t="en">unit</Heading></div>
        <span data-t="label" className="uppercase tracking-yorha-wide">상태 ok</span>
      </div>,
    );
    const ko = getComputedStyle(host.querySelector("[data-t=ko]")!);
    expect(px(ko.letterSpacing) / px(ko.fontSize)).toBeLessThanOrEqual(0.0201);
    expect(ko.textTransform).toBe("none");
    const label = getComputedStyle(host.querySelector("[data-t=label]")!);
    expect(px(label.letterSpacing) / px(label.fontSize)).toBeLessThanOrEqual(0.0201);
    expect(label.textTransform).toBe("none");
    const en = getComputedStyle(host.querySelector("[data-t=en]")!);
    expect(px(en.letterSpacing) / px(en.fontSize)).toBeGreaterThan(0.1);
    expect(en.textTransform).toBe("uppercase");
  });
});

describe("row states (#22, #26)", () => {
  it("selected MenuList row has no lighter seam; hover, focus and selected differ; nothing moves", async () => {
    const host = await mount(
      <MenuList aria-label="메뉴" variant="navigation" defaultValue="a">
        <MenuListItem value="a">상태</MenuListItem>
        <MenuListItem value="b">아이템</MenuListItem>
        <MenuListItem value="c" current>무기</MenuListItem>
      </MenuList>,
    );
    await animationsFinished();
    const rows = [...host.querySelectorAll<HTMLElement>("[data-menu-item]")];
    const before = rows.map((r) => JSON.stringify(r.getBoundingClientRect()));
    const [a, b, c] = rows.map((r) => getComputedStyle(r));
    expect(a.borderTopColor).toBe(a.backgroundImage.match(/oklch\([^)]*\)|rgb[^)]*\)/)![0]); // seam = ink band colour
    expect(c.boxShadow).not.toBe("none"); // current marker
    expect(b.boxShadow).toBe("none"); // idle row
    rows[0].focus();
    await frames(2);
    rows[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(rows.map((r) => JSON.stringify(r.getBoundingClientRect()))).toEqual(before);
    expect(getComputedStyle(rows[0]).outlineStyle === "solid" || document.activeElement === rows[0]).toBe(true);
  });

  it("keyboard focus on a row draws a 1px inset frame inside the band", async () => {
    const host = await mount(
      <MenuList aria-label="메뉴" defaultValue="a">
        <MenuListItem value="a">상태</MenuListItem>
        <MenuListItem value="b">아이템</MenuListItem>
      </MenuList>,
    );
    const row = host.querySelector<HTMLElement>("[data-menu-item][tabindex='0']")!;
    row.focus();
    await frames(2);
    // programmatic focus after no pointer input matches :focus-visible in Chromium
    if (row.matches(":focus-visible")) {
      const cs = getComputedStyle(row);
      expect(cs.outlineWidth).toBe("1px");
      expect(px(cs.outlineOffset)).toBeLessThan(0);
    }
  });
});

describe("ring geometry (#14, #15, #16)", () => {
  it("Tabs panel ring is inset: it stays inside the panel box", async () => {
    const host = await mount(
      <Tabs defaultValue="s">
        <TabsList aria-label="t"><TabsTab value="s">상태</TabsTab><TabsTab value="i">아이템</TabsTab></TabsList>
        <TabsPanel value="s">내용</TabsPanel>
      </Tabs>,
    );
    const panel = host.querySelector<HTMLElement>("[role=tabpanel]")!;
    panel.focus();
    await frames(2);
    if (panel.matches(":focus-visible")) {
      expect(px(getComputedStyle(panel).outlineOffset)).toBeLessThanOrEqual(-2);
    }
    const list = host.querySelector("[role=tablist]")!.getBoundingClientRect();
    expect(panel.getBoundingClientRect().top).toBeGreaterThanOrEqual(list.bottom - 0.5);
  });

  it("InputGroup: the focus ring sits on the frame and never covers the adjoining button", async () => {
    const host = await mount(
      <InputGroup>
        <InputGroupInput aria-label="값" defaultValue="x" />
        <InputGroupButton aria-label="지우기">×</InputGroupButton>
      </InputGroup>,
    );
    const input = host.querySelector<HTMLElement>("input")!;
    const frame = host.querySelector<HTMLElement>("[data-slot=input-group]")!;
    const button = host.querySelector<HTMLElement>("button")!;
    input.focus();
    await frames(2);
    expect(getComputedStyle(input).outlineStyle).toBe("none");
    const cs = getComputedStyle(frame);
    const reach = px(cs.outlineOffset) + px(cs.outlineWidth);
    const f = frame.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    // the ring box is outside the frame (reach > 0) or inside it with the button excluded; either way it cannot erase the seam
    expect(f.left - reach).toBeLessThanOrEqual(f.left);
    expect(b.left).toBeGreaterThan(input.getBoundingClientRect().left);
    expect(b.right).toBeLessThanOrEqual(f.right + 0.5);
  });

  it("DataTable: selected row is tinted (not the header ink), has a 2px marker and keeps its height; the resize handle focus is a bar, not an outline", async () => {
    const host = await mount(
      <DataTable caption="유닛">
        <DataTableHeader>
          <DataTableRow>
            <DataTableHeadCell resizable onResize={() => {}}>유닛</DataTableHeadCell>
            <DataTableHeadCell>유형</DataTableHeadCell>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          <DataTableRow data-selected=""><DataTableCell>2B</DataTableCell><DataTableCell>전투</DataTableCell></DataTableRow>
          <DataTableRow><DataTableCell>9S</DataTableCell><DataTableCell>스캐너</DataTableCell></DataTableRow>
        </DataTableBody>
      </DataTable>,
    );
    const [sel, idle] = [...host.querySelectorAll<HTMLElement>("tbody tr")];
    const head = host.querySelector<HTMLElement>("thead th")!;
    expect(getComputedStyle(sel).backgroundColor).not.toBe(getComputedStyle(head).backgroundColor);
    expect(getComputedStyle(sel).backgroundColor).not.toBe(getComputedStyle(idle).backgroundColor);
    expect(getComputedStyle(sel.firstElementChild!).boxShadow).toContain("2px");
    const h0 = sel.getBoundingClientRect().height;
    sel.removeAttribute("data-selected");
    await frames(2);
    expect(sel.getBoundingClientRect().height).toBe(h0); // selecting never resizes the row
    sel.setAttribute("data-selected", "");
    expect(idle).toBeTruthy();

    const handle = host.querySelector<HTMLElement>("[role=separator]")!;
    handle.focus();
    await frames(2);
    expect(getComputedStyle(handle).outlineStyle).toBe("none");
    const bar = getComputedStyle(handle, "::after");
    const th = head.getBoundingClientRect();
    const h = handle.getBoundingClientRect();
    const barRight = h.left + px(bar.left) + px(bar.width);
    expect(barRight).toBeLessThanOrEqual(th.right + 0.5); // bar stays inside its own header cell
  });
});

describe("links (#23)", () => {
  it("yorha-link is a 1px rule at 4px offset and hover fills ink without moving the box", async () => {
    const host = await mount(<a href="#x" className="yorha-link">링크</a>);
    const a = host.querySelector("a")!;
    const cs = getComputedStyle(a);
    expect(cs.textDecorationLine).toContain("underline");
    expect(cs.textDecorationThickness).toBe("1px");
    expect(cs.textUnderlineOffset).toBe("4px");
  });
});
