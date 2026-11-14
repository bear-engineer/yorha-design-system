import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ROWS = [
  { value: "overview", title: "개요", body: "유닛 배치 현황을 요약한다." },
  { value: "orders", title: "임무 지시", body: "다음 임무 지시를 확인한다." },
  { value: "archive", title: "기록 보관", body: "과거 기록을 열람한다." },
];
const THEMES = ["light", "dark", "high-contrast"] as const;

interface DemoProps {
  multiple?: boolean;
  defaultValue?: unknown;
  themed?: boolean;
}

function Demo({ multiple, defaultValue }: DemoProps) {
  return (
    <div className="w-96 bg-yorha-panel p-4 text-yorha-fg">
      <Accordion multiple={multiple} defaultValue={defaultValue}>
        {ROWS.map((r) => (
          <AccordionItem key={r.value} value={r.value}>
            <AccordionHeader>
              <AccordionTrigger>{r.title}</AccordionTrigger>
            </AccordionHeader>
            <AccordionPanel>{r.body}</AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

const meta = {
  title: "컴포넌트/표시/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Accordion>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const overview = c.getByRole("button", { name: "개요" });
    const orders = c.getByRole("button", { name: "임무 지시" });
    await expect(overview).toHaveAttribute("aria-expanded", "false");

    // Enter toggles open
    overview.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(overview).toHaveAttribute("aria-expanded", "true"));
    await expect(c.getByText("유닛 배치 현황을 요약한다.")).toBeVisible();

    // Space toggles closed
    await userEvent.keyboard(" ");
    await waitFor(() => expect(overview).toHaveAttribute("aria-expanded", "false"));

    // Space opens again; the controlled panel is linked to its trigger
    await userEvent.keyboard(" ");
    await waitFor(() => expect(overview).toHaveAttribute("aria-expanded", "true"));
    const panelId = overview.getAttribute("aria-controls");
    await expect(panelId).toBeTruthy();
    await expect(document.getElementById(panelId!)).not.toBeNull();

    // Single mode: opening another row closes the first
    orders.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(orders).toHaveAttribute("aria-expanded", "true"));
    await waitFor(() => expect(overview).toHaveAttribute("aria-expanded", "false"));
  },
};

export const Multiple: Story = {
  render: () => <Demo multiple />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const overview = c.getByRole("button", { name: "개요" });
    const orders = c.getByRole("button", { name: "임무 지시" });
    overview.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(overview).toHaveAttribute("aria-expanded", "true"));
    await waitFor(() => expect(orders).toHaveAttribute("aria-expanded", "true"));
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t}>
          <Demo />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic">
      <Demo />
    </div>
  ),
};
