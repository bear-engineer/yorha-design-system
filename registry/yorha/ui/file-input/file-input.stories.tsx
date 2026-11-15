import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { FileInput, formatFileSize } from "./file-input";

const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = { light: "라이트", dark: "다크", "high-contrast": "고대비" };
const wrapper = (Story: React.ComponentType) => (
  <div lang="ko" className="w-[28rem] max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
    <Story />
  </div>
);
async function inMotion(mode: "reduced" | "off", run: () => Promise<void>) {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.setAttribute("data-motion", mode);
  try {
    await run();
  } finally {
    if (prev === null) root.removeAttribute("data-motion");
    else root.setAttribute("data-motion", prev);
  }
}
const seconds = (el: Element) => parseFloat(getComputedStyle(el).transitionDuration) || 0;

const makeFiles = (...specs: [name: string, size: number, type?: string][]) =>
  specs.map(([name, size, type = "text/plain"]) => new File([new Uint8Array(size)], name, { type }));
const toDataTransfer = (files: File[]) => {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  return dt;
};
// testing-library copies only own properties of a DataTransfer, which drops its files; build the event directly.
const fireDrop = (target: Element, dataTransfer: DataTransfer) =>
  target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
const nativeOf = (root: HTMLElement) => root.querySelector<HTMLInputElement>("input[type=file]")!;
const zoneOf = (root: HTMLElement) => root.querySelector<HTMLElement>("[data-slot=file-drop-zone]")!;

const meta = {
  title: "컴포넌트/폼/FileInput",
  component: FileInput,
  tags: ["autodocs"],
  args: { label: "첨부 파일" },
  decorators: [wrapper],
} satisfies Meta<typeof FileInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FormatSize: Story = {
  play: async () => {
    await expect(formatFileSize(0, "ko-KR")).toMatch(/^0\s?(B|byte|바이트)$/);
    await expect(formatFileSize(1536, "en-US")).toMatch(/^1\.5\s?kB$/);
    await expect(formatFileSize(5 * 1024 * 1024, "en-US")).toMatch(/^5\s?MB$/);
  },
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const native = nativeOf(canvasElement);
    await expect(native).toHaveAttribute("type", "file");
    await expect(c.getByLabelText("첨부 파일", { selector: "input" })).toBe(native);
    await expect(c.getByRole("button", { name: /파일 선택/ })).toBeInTheDocument();
    await expect(c.queryByRole("list")).toBeNull();
  },
};

export const AddAndRemoveFiles: Story = {
  args: { multiple: true, onFilesChange: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const native = nativeOf(canvasElement);
    const files = makeFiles(["a.txt", 1536], ["b.txt", 2048]);
    fireEvent.change(native, { target: { files: toDataTransfer(files).files } });
    const list = await c.findByRole("list", { name: "선택한 파일" });
    await expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    await expect(within(list).getByText("a.txt")).toBeInTheDocument();
    await expect(within(list).getByText(formatFileSize(1536, "ko-KR").replace(/\u00a0/g, " "))).toBeInTheDocument();
    await expect(args.onFilesChange).toHaveBeenLastCalledWith(expect.arrayContaining([files[0], files[1]]));
    await expect(native.files).toHaveLength(2);
    // remove one
    await userEvent.click(c.getByRole("button", { name: "a.txt 제거" }));
    await waitFor(() => expect(within(list).getAllByRole("listitem")).toHaveLength(1));
    await expect(c.queryByText("a.txt")).toBeNull();
    await expect(native.files).toHaveLength(1);
    await expect((args.onFilesChange as ReturnType<typeof fn>).mock.lastCall![0]).toHaveLength(1);
    await expect(c.getByRole("status")).toHaveTextContent("a.txt");
    // remove the last: list disappears and focus moves to the select button
    await userEvent.click(c.getByRole("button", { name: "b.txt 제거" }));
    await waitFor(() => expect(c.queryByRole("list")).toBeNull());
    await expect(c.getByRole("button", { name: /파일 선택/ })).toHaveFocus();
  },
};

export const SingleReplacesFile: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const native = nativeOf(canvasElement);
    await expect(native).not.toHaveAttribute("multiple");
    fireEvent.change(native, { target: { files: toDataTransfer(makeFiles(["one.txt", 10])).files } });
    await c.findByText("one.txt");
    fireEvent.change(native, { target: { files: toDataTransfer(makeFiles(["two.txt", 10])).files } });
    await c.findByText("two.txt");
    await expect(c.queryByText("one.txt")).toBeNull();
  },
};

export const KeyboardOpensPicker: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const native = nativeOf(canvasElement);
    const click = fn();
    native.addEventListener("click", (e) => {
      e.preventDefault();
      click();
    });
    const button = c.getByRole("button", { name: /파일 선택/ });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(click).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(" ");
    await expect(click).toHaveBeenCalledTimes(2);
  },
};

export const AcceptAttribute: Story = {
  args: { accept: "image/*,.pdf", multiple: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const native = nativeOf(canvasElement);
    await expect(native).toHaveAttribute("accept", "image/*,.pdf");
    await expect(native).toHaveAttribute("multiple");
    await expect(c.getByText(/image\/\*,\.pdf|이미지|PDF/)).toBeInTheDocument();
  },
};

export const DropZone: Story = {
  args: { multiple: true, accept: "text/plain", onFilesChange: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const zone = zoneOf(canvasElement);
    await expect(zone).not.toHaveAttribute("data-dragging");
    const files = makeFiles(["drop.txt", 100], ["pic.png", 100, "image/png"]);
    const dataTransfer = toDataTransfer(files);
    fireEvent.dragEnter(zone, { dataTransfer });
    await waitFor(() => expect(zone).toHaveAttribute("data-dragging", "true"));
    fireEvent.dragOver(zone, { dataTransfer });
    fireEvent.dragLeave(zone, { dataTransfer });
    await waitFor(() => expect(zone).not.toHaveAttribute("data-dragging"));
    fireEvent.dragEnter(zone, { dataTransfer });
    fireDrop(zone, dataTransfer);
    await waitFor(() => expect(zone).not.toHaveAttribute("data-dragging"));
    // files that do not match accept are rejected
    await c.findByText("drop.txt");
    await expect(c.queryByText("pic.png")).toBeNull();
    await expect(args.onFilesChange).toHaveBeenLastCalledWith([files[0]]);
    await expect(c.getByRole("alert")).toHaveTextContent("pic.png");
  },
};

export const MaxSize: Story = {
  args: { maxSize: 1000, multiple: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    fireEvent.change(nativeOf(canvasElement), {
      target: { files: toDataTransfer(makeFiles(["small.txt", 500], ["big.txt", 5000])).files },
    });
    await c.findByText("small.txt");
    await expect(c.queryByText("big.txt")).toBeNull();
    await expect(c.getByRole("alert")).toHaveTextContent("big.txt");
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: /파일 선택/ })).toBeDisabled();
    await expect(nativeOf(canvasElement)).toBeDisabled();
    const zone = zoneOf(canvasElement);
    fireDrop(zone, toDataTransfer(makeFiles(["x.txt", 1])));
    await expect(c.queryByText("x.txt")).toBeNull();
  },
};

export const ReducedMotion: Story = {
  play: async ({ canvasElement }) => {
    const zone = zoneOf(canvasElement);
    const button = within(canvasElement).getByRole("button", { name: /파일 선택/ });
    await inMotion("reduced", async () => {
      await expect(seconds(zone)).toBeLessThanOrEqual(0.12);
      await expect(seconds(button)).toBeLessThanOrEqual(0.12);
    });
    await inMotion("off", async () => expect(seconds(zone)).toBe(0));
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
          <FileInput label={`첨부 파일 (${THEME_LABEL[t]})`} multiple />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const t of THEMES) await expect(c.getByLabelText(`첨부 파일 (${THEME_LABEL[t]})`, { selector: "input" })).toBeInTheDocument();
  },
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <FileInput label="오리지널 팔레트" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(nativeOf(canvasElement)).toHaveAttribute("type", "file");
  },
};

export const States: Story = {
  render: () => (
    <div className="flex w-full flex-col gap-4">
      <FileInput label="기본" multiple maxSize={1000} />
      <FileInput label="잠김" disabled />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const native = canvasElement.querySelectorAll<HTMLInputElement>("input[type=file]")[0]!;
    fireEvent.change(native, { target: { files: toDataTransfer(makeFiles(["small.txt", 500], ["big.txt", 5000])).files } });
    await c.findByText("small.txt");
    const alert = c.getByRole("alert");
    const zone = canvasElement.querySelectorAll<HTMLElement>("[data-slot=file-drop-zone]")[0]!;
    await expect(zone.getAttribute("aria-describedby") ?? "").toContain(alert.id);
    await expectTargetSize(canvasElement);
  },
};

/** V4-140: required + empty blocks submit, focuses the button and shows the message; a file in FormData clears it. */
export const RequiredInForm: Story = {
  render: (args) => (
    <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
      <FileInput {...args} label="첨부" name="doc" required />
      <div className="flex gap-2">
        <button type="submit" className="underline">제출</button>
        <button type="reset" className="underline">초기화</button>
      </div>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "제출" }));
    await expect(await c.findByRole("alert")).toHaveTextContent("파일을 선택하세요");
    await expect(zoneOf(canvasElement).querySelector("button")).toHaveFocus();
    fireDrop(zoneOf(canvasElement), toDataTransfer(makeFiles(["a.txt", 10])));
    await c.findByText("a.txt");
    await expect((new FormData(canvasElement.querySelector("form")!).get("doc") as File).name).toBe("a.txt");
  },
};

/** V4-141 / V4-146: maxFiles, accumulating rejections, per-file 8-segment bar, clear all. */
export const LimitsAndProgress: Story = {
  render: (args) => (
    <FileInput
      {...args}
      label="사진"
      multiple
      maxFiles={2}
      accept=".txt"
      status={(f, i) => (i === 0 ? { state: "uploading", progress: 0.5 } : { state: f.size > 100 ? "error" : "done" })}
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    fireDrop(zoneOf(canvasElement), toDataTransfer(makeFiles(["1.txt", 10], ["2.txt", 500], ["3.txt", 10])));
    await c.findByText("2.txt");
    await expect(canvasElement.querySelectorAll("[data-segment]")).toHaveLength(16);
    await expect(c.getByRole("alert")).toHaveTextContent("3.txt");
    await expect(c.getByRole("button", { name: "모두 지우기" })).toBeEnabled();
  },
};
