import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Link, useLocation } from "react-router";
import { withRouter } from "../../../../.storybook/decorators";

function Where() {
  const { pathname, search } = useLocation();
  return (
    <div className="flex items-center gap-3 text-yorha-fg">
      <span className="inline-flex items-stretch border border-yorha-border font-yorha-mono text-yorha-xs">
        <span className="bg-yorha-ink px-2 py-1 text-yorha-on-ink">경로</span>
        <output data-testid="loc" className="px-2 py-1">{pathname + search}</output>
      </span>
      <Link to="/next" className="inline-flex min-h-[24px] items-center">다음</Link>
    </div>
  );
}

const meta = {
  title: "프로바이더/withRouter 데코레이터",
  component: Where,
  tags: ["autodocs"],
  decorators: [withRouter],
} satisfies Meta<typeof Where>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "기본 경로",
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getByTestId("loc")).toHaveTextContent("/");
  },
};

export const InitialEntries: Story = {
  name: "initialEntries",
  parameters: { route: { path: "/items/:id", initialEntries: ["/items/7?tab=a"] } },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getByTestId("loc")).toHaveTextContent("/items/7?tab=a");
  },
};
