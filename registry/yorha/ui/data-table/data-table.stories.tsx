import { expectTargetSize } from "../../../../.storybook/preview";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
  type SortDirection,
} from "@/components/ui/data-table";

const ROWS = [
  { id: "2b", unit: "2B", type: "전투", level: 7 },
  { id: "9s", unit: "9S", type: "스캐너", level: 5 },
  { id: "a2", unit: "A2", type: "전투", level: 9 },
];

function Demo({ density = "comfortable", zebra = true }: { density?: "dense" | "comfortable"; zebra?: boolean }) {
  const [sort, setSort] = useState<SortDirection>("none");
  const rows = [...ROWS].sort((a, b) => {
    if (sort === "none") return 0;
    return sort === "ascending" ? a.level - b.level : b.level - a.level;
  });
  return (
    <div className="w-[32rem] max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <DataTable caption="유닛 목록" density={density} zebra={zebra}>
        <DataTableHeader>
          <DataTableRow>
            <DataTableHeadCell>유닛</DataTableHeadCell>
            <DataTableHeadCell>유형</DataTableHeadCell>
            <DataTableHeadCell sortable sortDirection={sort} onSortChange={setSort}>
              레벨
            </DataTableHeadCell>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((r) => (
            <DataTableRow key={r.id}>
              <DataTableCell>{r.unit}</DataTableCell>
              <DataTableCell>{r.type}</DataTableCell>
              <DataTableCell numeric>{r.level}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  );
}

const meta = {
  title: "컴포넌트/표시/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { caption: "유닛 목록" },
} satisfies Meta<typeof DataTable>;
export default meta;
type Story = StoryObj<typeof meta>;

const firstUnit = (canvasElement: HTMLElement) => canvasElement.querySelector("tbody tr td")?.textContent?.trim();
const sortButton = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole("button", { name: "레벨" });
const sortHeader = (canvasElement: HTMLElement) => sortButton(canvasElement).closest("th");

export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("table", { name: "유닛 목록" })).toBeInTheDocument();
    await expect(canvas.getAllByRole("columnheader")).toHaveLength(3);
    for (const th of canvas.getAllByRole("columnheader")) {
      await expect(th).toHaveAttribute("scope", "col");
    }
    await expect(canvasElement.querySelector("table")).toHaveAttribute("data-zebra", "true");
    await expect(canvasElement.querySelector("table")).toHaveAttribute("data-density", "comfortable");
    await expect(sortHeader(canvasElement)).toHaveAttribute("aria-sort", "none");
  },
};

export const SortToggle: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    await expect(firstUnit(canvasElement)).toBe("2B");
    await userEvent.click(sortButton(canvasElement));
    await expect(sortHeader(canvasElement)).toHaveAttribute("aria-sort", "ascending");
    await expect(firstUnit(canvasElement)).toBe("9S");
    await userEvent.click(sortButton(canvasElement));
    await expect(sortHeader(canvasElement)).toHaveAttribute("aria-sort", "descending");
    await expect(firstUnit(canvasElement)).toBe("A2");
  },
};

export const KeyboardSort: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const button = sortButton(canvasElement);
    button.focus();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(sortHeader(canvasElement)).toHaveAttribute("aria-sort", "ascending");
    await userEvent.keyboard(" ");
    await expect(sortHeader(canvasElement)).toHaveAttribute("aria-sort", "descending");
  },
};

export const Dense: Story = {
  render: () => <Demo density="dense" zebra={false} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("table")).toHaveAttribute("data-density", "dense");
    await expect(canvasElement.querySelector("table")).toHaveAttribute("data-zebra", "false");
  },
};

/** Multi-theme story: light, dark and high-contrast only (authentic lives in its own story). */
export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {(["light", "dark", "high-contrast"] as const).map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg" data-testid={`theme-${t}`}>
          <Demo />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const light = canvasElement.querySelector('[data-testid="theme-light"]');
    const dark = canvasElement.querySelector('[data-testid="theme-dark"]');
    await expect(light).not.toBeNull();
    await expect(dark).not.toBeNull();
    await expect(getComputedStyle(light as Element).backgroundColor).not.toBe(
      getComputedStyle(dark as Element).backgroundColor,
    );
  },
};

/** Authentic theme alone; a11y is "todo" because the authentic palette is decorative-only (see tokens.md). */
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
      <Demo />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("table")).not.toBeNull();
  },
};

/** State matrix: sortable header (none/ascending), dense and comfortable rows. Targets >= 24px in both densities. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Demo />
      <Demo density="dense" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const [first] = c.getAllByRole("button", { name: "레벨" });
    await userEvent.click(first!);
    await expect(first!.closest("th")).toHaveAttribute("aria-sort", "ascending");
    await expect(first).toHaveFocus();
    await expectTargetSize(canvasElement);
  },
};
