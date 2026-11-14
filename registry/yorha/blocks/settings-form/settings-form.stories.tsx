import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { withRouter } from "../../../../.storybook/decorators";
import SettingsFormRoute, { meta as routeMeta } from "./settings-form";

const meta = {
  title: "블록/SettingsForm",
  component: SettingsFormRoute,
  tags: ["autodocs"],
  decorators: [withRouter],
  parameters: { layout: "fullscreen", route: { path: "/settings" } },
} satisfies Meta<typeof SettingsFormRoute>;
export default meta;
type Story = StoryObj<typeof meta>;

async function expectPage(canvasElement: HTMLElement, theme: string) {
  const c = within(canvasElement);
  await expect(document.documentElement).toHaveAttribute("data-theme", theme);
  await expect(c.getByRole("main", { name: "본문" })).toBeInTheDocument();
  await expect(c.getByRole("heading", { level: 1, name: "유닛 설정" })).toBeInTheDocument();
  await expect(c.getByRole("textbox", { name: "유닛 이름" })).toBeInTheDocument();
  await expect(c.getByRole("combobox", { name: "구역" })).toBeInTheDocument();
  await expect(c.getByRole("switch", { name: "알림 받기" })).toBeInTheDocument();
  await expect(c.getByRole("textbox", { name: "인증 코드" })).toBeInTheDocument();
}

export const Default: Story = {
  name: "라이트 테마",
  globals: { theme: "light" },
  play: async ({ canvasElement }) => expectPage(canvasElement, "light"),
};
export const DarkTheme: Story = {
  name: "다크 테마",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => expectPage(canvasElement, "dark"),
};
export const HighContrastTheme: Story = {
  name: "고대비 테마",
  globals: { theme: "high-contrast" },
  play: async ({ canvasElement }) => expectPage(canvasElement, "high-contrast"),
};
/** Authentic 테마 단독 스토리. 원본 팔레트는 대비 검증 대상이 아니므로 a11y를 todo로 둔다. */
export const Authentic: Story = {
  name: "Authentic",
  globals: { theme: "authentic" },
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => expectPage(canvasElement, "authentic"),
};

export const RouteMeta: Story = {
  name: "meta 제목",
  play: async () => {
    const [entry] = routeMeta() as Array<{ title: string }>;
    await expect(entry?.title).toMatch(/설정/);
  },
};

/** 잘못된 제출: 저장하지 않고 오류 요약으로 포커스가 가며, 필드마다 오류가 붙는다. */
export const InvalidSubmit: Story = {
  name: "잘못된 제출은 오류 요약에 포커스",
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "저장" }));
    const summary = await c.findByRole("group", { name: /입력을 확인/ });
    await waitFor(() => expect(summary).toHaveFocus());
    await expect(within(summary).getAllByRole("link")).toHaveLength(3);
    await expect(c.getByRole("textbox", { name: "유닛 이름" })).toHaveAttribute("aria-invalid", "true");
    await expect(screen.queryByText("저장 완료")).toBeNull();
    // 요약 링크는 해당 입력으로 포커스를 옮긴다.
    await userEvent.click(within(summary).getByRole("link", { name: /유닛 이름/ }));
    await expect(c.getByRole("textbox", { name: "유닛 이름" })).toHaveFocus();
  },
};

/** 올바른 제출: 제출 중 상태를 거쳐 성공 토스트가 뜬다. */
export const ValidSubmit: Story = {
  name: "올바른 제출은 성공 토스트",
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("textbox", { name: "유닛 이름" }), "2B");
    const zone = c.getByRole("combobox", { name: "구역" });
    await userEvent.click(zone);
    await userEvent.click(await screen.findByRole("option", { name: "벙커" }));
    await userEvent.click(c.getByRole("textbox", { name: "인증 코드" }));
    await userEvent.keyboard("123456");
    const submit = c.getByRole("button", { name: "저장" });
    await userEvent.click(submit);
    await expect(await c.findByRole("button", { name: "저장 중…" })).toHaveAttribute("aria-disabled", "true");
    await expect(await screen.findByText("저장 완료", {}, { timeout: 4000 })).toBeInTheDocument();
    await waitFor(() => expect(c.getByRole("button", { name: "저장" })).not.toHaveAttribute("aria-disabled", "true"));
    await expect(c.queryByRole("group", { name: /입력을 확인/ })).toBeNull();
  },
};
