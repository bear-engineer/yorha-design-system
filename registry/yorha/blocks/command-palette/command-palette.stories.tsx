import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import CommandPaletteDemo from "./command-palette";

const meta = {
  title: "블록/Command palette",
  component: CommandPaletteDemo,
  tags: ["autodocs"],
  // The demo is a page (own <main>): the docs page renders it in an iframe, like the other blocks, so it is not a second main landmark.
  parameters: { docs: { story: { inline: false, iframeHeight: 360 } }, layout: "fullscreen" },
} satisfies Meta<typeof CommandPaletteDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);

export const Default: Story = {};

/** 열고 거르고 Enter로 실행하면 닫히고 포커스가 트리거로 돌아온다. */
export const FilterAndRun: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: /명령 팔레트/ });
    await userEvent.click(trigger);
    const field = await body().findByRole("searchbox", { name: "명령 검색" });
    await userEvent.type(field, "정찰");
    await expect(body().getAllByRole("option")).toHaveLength(1);
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body().queryByRole("searchbox")).toBeNull());
    await waitFor(() => expect(within(canvasElement).getByText("실행: 지역 정찰")).toBeVisible());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: /명령 팔레트/ }));
    await userEvent.type(await body().findByRole("searchbox", { name: "명령 검색" }), "zzz");
    // the dialog popup fades in from opacity 0: the status exists before it is visible
    await waitFor(() => expect(body().getByText("일치하는 명령이 없습니다")).toBeVisible());
  },
};
