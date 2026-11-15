import type { Meta, StoryObj } from "@storybook/react-vite";
import { Row, Sheet } from "../../../../src/docs/sheet";
import { expect, waitFor, within } from "storybook/test";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage, AvatarStatus } from "./avatar";


/** Inline SVG portrait: no binary assets in the registry. */
const PORTRAIT = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#8a8373"/><circle cx="32" cy="26" r="12" fill="#2c2a25"/><path d="M12 64c0-14 9-22 20-22s20 8 20 22z" fill="#2c2a25"/></svg>',
)}`;
/** Undecodable data URI: fires the image error (so the initials show) without a network 404. */
const BROKEN = "data:image/png;base64,AAAA";
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

/** Docs hero: labelled variants at a readable scale. */
export const Overview: Story = {
  name: "구성 한눈에",
  render: () => (
    <Sheet title="Avatar">
      <Row label="sm / md / lg">
        {(["sm", "md", "lg"] as const).map((s) => (
          <Avatar key={s} size={s}><AvatarImage src={PORTRAIT} alt={`2B ${s}`} /><AvatarFallback>2B</AvatarFallback></Avatar>
        ))}
        <Avatar size="md"><AvatarFallback>9S</AvatarFallback></Avatar>
      </Row>
      <Row label="상태">
        {(["online", "away", "busy", "offline"] as const).map((st) => (
          <div key={st} className="flex items-center gap-2"><Avatar size="md"><AvatarFallback>A2</AvatarFallback></Avatar><AvatarStatus status={st} /></div>
        ))}
      </Row>
    </Sheet>
  ),
};

export const Default: Story = {
  tags: ["!autodocs"],
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
  render: () => <Demo src={BROKEN} initials="A2" />,
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

export const StatusAndGroup: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-6 text-yorha-fg">
      <div className="flex gap-4">
        {(["online", "away", "busy", "offline"] as const).map((s) => (
          <Avatar key={s} size="lg">
            <AvatarFallback>2B</AvatarFallback>
            <AvatarStatus status={s} />
          </Avatar>
        ))}
      </div>
      <AvatarGroup max={3} label="팀">
        {["2B", "9S", "A2", "PO", "D"].map((n) => (
          <Avatar key={n}>
            <AvatarFallback>{n}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("img", { name: "온라인" })).toBeInTheDocument();
    await expect(c.getByRole("img", { name: "외 2명" })).toHaveTextContent("+2");
  },
};
