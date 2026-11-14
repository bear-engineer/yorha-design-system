import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

/** Inline SVG portrait: no binary assets in the registry. */
const PORTRAIT = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#8a8373"/><circle cx="32" cy="26" r="12" fill="#2c2a25"/><path d="M12 64c0-14 9-22 20-22s20 8 20 22z" fill="#2c2a25"/></svg>',
)}`;
const THEMES = ["light", "dark", "high-contrast"] as const;

function Demo({ src, initials = "2B" }: { src?: string; initials?: string }) {
  return (
    <div className="flex items-center gap-4 bg-yorha-panel p-4 text-yorha-fg">
      <Avatar>
        {src ? <AvatarImage src={src} alt="2B 유닛" /> : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    </div>
  );
}

const meta = {
  title: "컴포넌트/구조/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo src={PORTRAIT} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(c.getByRole("img", { name: "2B 유닛" })).toBeInTheDocument());
    // square YoRHa frame: bordered, no rounding
    const frame = canvasElement.querySelector('[data-slot="avatar"]') as HTMLElement;
    await expect(frame).toHaveClass("border-yorha-border");
    await expect(getComputedStyle(frame).borderRadius).toBe("0px");
  },
};

export const FallbackInitials: Story = {
  render: () => <Demo src="/__yorha_missing_avatar__.png" initials="A2" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(c.getByText("A2")).toBeVisible());
    await expect(c.queryByRole("img", { name: "2B 유닛" })).toBeNull();
    await expect(canvasElement.querySelector('[data-slot="avatar-fallback"]')).toHaveClass("font-yorha");
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t}>
          <Demo src={PORTRAIT} />
          <Demo initials="A2" />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic">
      <Demo src={PORTRAIT} />
    </div>
  ),
};
