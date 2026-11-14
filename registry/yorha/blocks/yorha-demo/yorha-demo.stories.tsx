import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { withRouter } from "../../../../.storybook/decorators";
import YorhaDemo from "./yorha-demo";

const meta = {
  title: "블록/YorhaDemo",
  component: YorhaDemo,
  tags: ["autodocs"],
  decorators: [withRouter],
  parameters: { layout: "fullscreen", route: { path: "/settings" } },
} satisfies Meta<typeof YorhaDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Shared checks: one banner, one named main, one h1, the requested theme on <html>. */
async function expectPage(canvasElement: HTMLElement, theme: string) {
  const c = within(canvasElement);
  await expect(document.documentElement).toHaveAttribute("data-theme", theme);
  await expect(c.getByRole("banner")).toBeInTheDocument();
  await expect(c.getByRole("main", { name: "본문" })).toBeInTheDocument();
  await expect(c.getByRole("heading", { level: 1, name: "시스템 설정" })).toBeInTheDocument();
  await expect(c.getByRole("textbox", { name: "유닛 이름" })).toBeInTheDocument();
}

/** 라이트 테마. Dialog를 페이지에서 열고 Escape로 닫는다; 포커스는 트리거로 돌아온다. */
export const Default: Story = {
  name: "라이트 테마",
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    await expectPage(canvasElement, "light");
    const c = within(canvasElement);
    const trigger = c.getByRole("button", { name: "데이터 초기화" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    await expect(dialog).toHaveAccessibleName("설정 초기화 확인");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

export const DarkTheme: Story = {
  name: "다크 테마",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expectPage(canvasElement, "dark");
  },
};

export const HighContrastTheme: Story = {
  name: "고대비 테마",
  globals: { theme: "high-contrast" },
  play: async ({ canvasElement }) => {
    await expectPage(canvasElement, "high-contrast");
  },
};

/** Authentic 테마 단독 스토리. 원본 테마 토큰은 대비 검증 대상이 아니므로 a11y 검사를 todo로 둔다. */
export const Authentic: Story = {
  name: "Authentic",
  globals: { theme: "authentic" },
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    await expectPage(canvasElement, "authentic");
  },
};
