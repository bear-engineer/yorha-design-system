import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Heading } from "../heading/heading";
import { Prose, ProseTable } from "./prose";

const THEMES = ["light", "dark", "high-contrast"] as const;
const LONG_URL = "https://example.com/archive/unit-registry/2026/maintenance/" + "segment-".repeat(14) + "end.html";

const KO_PARAS = [
  "장비 점검은 매 교대 시작 전에 끝낸다. 점검 항목이 하나라도 비어 있으면 출격 승인은 보류된다.",
  "보고서의 문장은 짧게 끊고, 숫자와 단위 사이에는 공백을 둔다. 긴 복합어는 어절 단위에서만 줄바꿈한다.",
] as const;
const JA_PARAS = [
  "点検記録は交代の開始前に完了させる。項目が一つでも未記入の場合、出撃の承認は保留となる。",
  "文章は短く区切り、句読点の後で改行を許す。見出しと本文の間には十分な余白を置く。",
] as const;
const EN_PARAS = [
  "Inspection logs close before each shift starts. A single blank item holds the launch approval until the unit is re-checked.",
  "Keep sentences short, leave a clear gap between paragraphs, and let long identifiers wrap instead of pushing the layout sideways.",
] as const;

function Fixture() {
  return (
    <>
      <h2>점검 개요</h2>
      <p>{KO_PARAS[0]}</p>
      <p>{KO_PARAS[1]}</p>
      <ul>
        <li>연료 셀 전압 확인</li>
        <li>통신 채널 응답 시간 기록</li>
      </ul>
      <blockquote>점검은 기록이 남아야 완료된 것으로 본다.</blockquote>
      <h3>세부 항목</h3>
      <p>
        원본 로그는 <code>unit-7/telemetry.log</code> 경로에 있다. 명령 예시: <code>status --verbose --unit 7</code>
      </p>
      <pre>{"status --verbose --unit 7\nok: 12 channels\n"}</pre>
      <p>
        자세한 절차는 <a href="#procedure">점검 절차 문서</a>를 본다.
      </p>
    </>
  );
}

const meta = {
  title: "컴포넌트/YoRHa/Prose",
  component: Prose,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Prose>;
export default meta;
type Story = StoryObj<typeof meta>;

const measure = (el: HTMLElement) => parseFloat(getComputedStyle(el).maxWidth) <= 40 * parseFloat(getComputedStyle(el).fontSize) + 1;

export const Default: Story = {
  render: () => (
    <div lang="ko">
      <Prose>
        <Fixture />
      </Prose>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector(".yorha-prose") as HTMLElement;
    await expect(root).not.toBeNull();
    await expect(measure(root)).toBe(true);
    const p = within(canvasElement).getByText(KO_PARAS[0]);
    await expect(parseFloat(getComputedStyle(p).lineHeight) / parseFloat(getComputedStyle(p).fontSize)).toBeGreaterThanOrEqual(1.7);
  },
};

export const Korean: Story = {
  render: () => (
    <div lang="ko">
      <Prose>
        {KO_PARAS.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </Prose>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const p = within(canvasElement).getByText(KO_PARAS[1]);
    const cs = getComputedStyle(p);
    await expect(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toBeGreaterThanOrEqual(1.7);
    await expect(cs.wordBreak).toBe("keep-all");
  },
};

export const Japanese: Story = {
  render: () => (
    <div lang="ja">
      <Prose>
        {JA_PARAS.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </Prose>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const p = within(canvasElement).getByText(JA_PARAS[0]);
    await expect(getComputedStyle(p).lineBreak).toBe("strict");
  },
};

export const English: Story = {
  render: () => (
    <div lang="en">
      <Prose>
        {EN_PARAS.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </Prose>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const p = within(canvasElement).getByText(EN_PARAS[0]);
    const cs = getComputedStyle(p);
    await expect(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toBeCloseTo(1.6, 1);
  },
};

export const LongUrl: Story = {
  render: () => (
    <div lang="en" className="max-w-(--yorha-measure)">
      <Prose>
        <p>
          Reference: <a href={LONG_URL}>{LONG_URL}</a>
        </p>
      </Prose>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector(".yorha-prose") as HTMLElement;
    await expect(root.scrollWidth <= root.clientWidth + 1).toBe(true);
  },
};

const ROWS = Array.from({ length: 3 }, (_, i) => ({
  unit: `YX-${100 + i}`,
  load: (1234567.5 + i * 1111.25).toFixed(2),
  cells: ["12", "08", "41", "07", "33", "19", "02", "66"],
}));

/** FTXT-03: a prose h3 has the same case and tracking as Heading level 3 (Latin). */
export const HeadingParity: Story = {
  render: () => (
    <div lang="en">
      <Prose>
        <h3>Parity check</h3>
      </Prose>
      <Heading level={3}>Parity check</Heading>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [proseH3, headingH3] = Array.from(canvasElement.querySelectorAll<HTMLElement>("h3"));
    const p = getComputedStyle(proseH3!);
    const h = getComputedStyle(headingH3!);
    await expect(p.textTransform).toBe("uppercase");
    await expect(p.textTransform).toBe(h.textTransform);
    // tracking is an em value, so compare it per font size (prose h3 is 18px, Heading 3 is 22px)
    const em = (cs: CSSStyleDeclaration) => parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize);
    await expect(em(p).toFixed(3)).toBe(em(h).toFixed(3));
  },
};

/** FTXT-10: nested lists keep a 4px rhythm; only the outer list takes the 16px block margin. */
export const NestedLists: Story = {
  render: () => (
    <div lang="en">
      <Prose>
        <ul>
          <li>
            Outer item
            <ul>
              <li>Inner item</li>
            </ul>
          </li>
        </ul>
      </Prose>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const outer = canvasElement.querySelector<HTMLElement>("ul")!;
    const inner = canvasElement.querySelector<HTMLElement>("li ul")!;
    await expect(parseFloat(getComputedStyle(outer).marginTop)).toBeGreaterThanOrEqual(16);
    await expect(parseFloat(getComputedStyle(inner).marginTop)).toBeLessThanOrEqual(4);
  },
};

export const WideTable: Story = {
  render: () => (
    <div lang="en">
      <Prose>
        <ProseTable
          label="Unit load by channel"
          caption="Channel load"
          className="min-w-[720px]"
        >
          <thead>
            <tr>
              <th scope="col">Unit</th>
              <th scope="col">Load</th>
              {Array.from({ length: 8 }, (_, i) => (
                <th scope="col" key={i}>{`CH${i + 1}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.unit}>
                <th scope="row">{r.unit}</th>
                <td>{r.load}</td>
                {r.cells.map((c, i) => (
                  <td key={i}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </ProseTable>
      </Prose>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const region = within(canvasElement).getByRole("region", { name: "Unit load by channel" });
    await expect(region.getAttribute("tabindex")).toBe("0");
    const table = region.querySelector("table") as HTMLElement;
    await expect(getComputedStyle(table).fontVariantNumeric).toContain("tabular-nums");
    // FTXT-07: the table is wider than the 360 frame, so the region scrolls and shows the edge cue.
    await expect(region.scrollWidth > region.clientWidth).toBe(true);
    await expect(getComputedStyle(region).backgroundImage).toContain("linear-gradient");
  },
};

/** V4-264: the scroll region is a tab stop only while it overflows; a table that fits adds no extra stop. */
export const OverflowFocus: Story = {
  render: () => (
    <div lang="en">
      <Prose>
        <ProseTable label="Short table">
          <thead>
            <tr>
              <th scope="col">Unit</th>
              <th scope="col">Load</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">A2</th>
              <td>41</td>
            </tr>
          </tbody>
        </ProseTable>
        <ProseTable label="Wide table" className="min-w-[720px]">
          <thead>
            <tr>
              {Array.from({ length: 8 }, (_, i) => (
                <th scope="col" key={i}>{`CHANNEL ${i + 1}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {Array.from({ length: 8 }, (_, i) => (
                <td key={i}>{i * 7}</td>
              ))}
            </tr>
          </tbody>
        </ProseTable>
      </Prose>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const short = c.getByRole("region", { name: "Short table" });
    const wide = c.getByRole("region", { name: "Wide table" });
    await expect(short).not.toHaveAttribute("tabindex");
    await expect(wide).toHaveAttribute("tabindex", "0");
    await userEvent.tab();
    await expect(wide).toHaveFocus();
    await expect(getComputedStyle(wide).outlineStyle).not.toBe("none");
  },
};

export const ThemeGallery: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} lang="en" className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
          <Prose>
            <p>{`Theme ${t}: ${EN_PARAS[0]}`}</p>
          </Prose>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const t of THEMES) {
      await expect(c.getByText(`Theme ${t}:`, { exact: false })).toBeInTheDocument();
    }
  },
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  // Authentic fails 11 of 24 token pairs by design (tokens.md); this story is the only one that renders it.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" lang="en" className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
      <Prose>
        <p>{EN_PARAS[1]}</p>
      </Prose>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(EN_PARAS[1], { exact: false })).toBeInTheDocument();
  },
};
