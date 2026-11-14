import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Link, useLocation } from "react-router";
import { withRouter } from "../../../../.storybook/decorators";

function Where() {
  const { pathname, search } = useLocation();
  return (
    <p className="text-yorha-fg">
      현재 경로 <output data-testid="loc">{pathname + search}</output> <Link to="/next">다음</Link>
    </p>
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
