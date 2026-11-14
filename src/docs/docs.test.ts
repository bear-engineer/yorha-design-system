import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runCoverage } from "../../scripts/base-ui-coverage.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("coverage page (C14)", () => {
  it("embeds the generated Base UI coverage report", () => {
    expect(read("src/docs/guides/BaseUiCoverage.mdx")).toContain("../generated/base-ui-coverage.md?raw");
  });

  it("committed report equals the current `coverage:base-ui --report` output", () => {
    const { markdown } = runCoverage({
      root,
      baseUiDir: join(root, "node_modules", "@base-ui", "react"),
      exceptionsPath: join(root, "coverage.exceptions.json"),
    });
    const committed = read("src/docs/generated/base-ui-coverage.md");
    // Message tells the maintainer how to refresh.
    expect(committed, "stale: run pnpm coverage:base-ui --report --out src/docs/generated/base-ui-coverage.md").toBe(markdown);
  });
});

describe("guides (C14, T13, A1)", () => {
  const guides: Record<string, string> = {
    "MotionGuide.mdx": "가이드/모션 사양",
    "PageTransitions.mdx": "가이드/페이지 전환",
    "BentoLayout.mdx": "가이드/벤토 레이아웃",
    "Readability.mdx": "가이드/가독성",
    "SchedulingAndInputs.mdx": "가이드/일정·입력",
    "BaseUiCoverage.mdx": "가이드/Base UI 커버리지",
    "UxAudit.mdx": "가이드/UX 접근성 감사",
  };

  it.each(Object.entries(guides))("%s exists with title %s", (file, title) => {
    expect(existsSync(join(here, "guides", file))).toBe(true);
    expect(read(`src/docs/guides/${file}`)).toContain(`<Meta title="${title}" />`);
  });

  it("motion guide links Motion.mdx and states the one-utility rule and reduced/off", () => {
    const text = read("src/docs/guides/MotionGuide.mdx");
    expect(text).toContain("?path=/docs/파운데이션-motion--docs");
    expect(text).toContain("유틸리티 하나");
    expect(text).toContain("reduced");
    expect(text).toContain("off");
  });

  it("page transition guide states the React 19.3 back-navigation skip and the import-order workaround", () => {
    const text = read("src/docs/guides/PageTransitions.mdx");
    expect(text).toContain("React 19.3");
    expect(text).toContain("뒤로");
    expect(text).toContain("건너뜁니다");
    expect(text).toMatch(/라우터를 만들기 전에 `route-transition`을 import/);
  });

  it("readability guide covers CJK leading 1.7, measure, Prose and the text-spacing test", () => {
    const text = read("src/docs/guides/Readability.mdx");
    for (const needle of ["1.7", "--yorha-measure", "Prose", "pnpm test:text-spacing"]) expect(text).toContain(needle);
  });

  it("scheduling guide covers calendar, date-picker, timeline, kanban and all 22 input types", () => {
    const text = read("src/docs/guides/SchedulingAndInputs.mdx");
    for (const needle of ["Calendar", "DatePicker", "Timeline", "Kanban", "INPUT_TYPE_TABLE", "INPUT_TYPES"]) expect(text).toContain(needle);
  });

  it("UX audit page renders docs/ux-audit.md", () => {
    expect(read("src/docs/guides/UxAudit.mdx")).toContain("../../../docs/ux-audit.md?raw");
    expect(existsSync(join(root, "docs", "ux-audit.md"))).toBe(true);
  });

  it("Welcome links every guide", () => {
    const text = read("src/docs/Welcome.mdx");
    for (const id of [
      "가이드-모션-사양--docs",
      "가이드-페이지-전환--docs",
      "가이드-벤토-레이아웃--docs",
      "가이드-가독성--docs",
      "가이드-일정·입력--docs",
      "가이드-base-ui-커버리지--docs",
      "가이드-ux-접근성-감사--docs",
    ]) expect(text, id).toContain(`?path=/docs/${id}`);
  });
});

/** Every `.stories.tsx` under these roots. */
function storyFiles(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : storyFiles(rel);
    return entry.name.endsWith(".stories.tsx") ? [rel] : [];
  });
}

/** Raw HTML tags left in a story's JSDoc (outside `code` spans and fences). */
function rawTagsInDocComments(source: string): string[] {
  const found: string[] = [];
  for (const [, body = ""] of source.matchAll(/\/\*\*([\s\S]*?)\*\//g)) {
    const text = body
      .split("\n")
      .map((line) => line.replace(/^\s*\*? ?/, ""))
      .join("\n")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`\n]*`/g, "")
      .replace(/\{@[^}]*\}/g, "");
    for (const tag of text.matchAll(/<\/?([A-Za-z][\w-]*)[\s/>]/g)) found.push(`<${tag[1]}>`);
  }
  return found;
}

describe("story descriptions (Tokens docs freeze)", () => {
  // Autodocs renders a story's JSDoc as markdown, so an unquoted `<html>` becomes a real <html> React element.
  // React then ties <html> to a fiber of the docs root; the next `selectionchange` from any input on the page
  // walks container -> parent forever (dispatchEventForPluginEventSystem) and the main thread never returns.
  it("no raw HTML tags in story JSDoc (src/ and registry/)", () => {
    const offenders = [...storyFiles("src"), ...storyFiles("registry")].flatMap((file) => rawTagsInDocComments(read(file)).map((tag) => `${file}: ${tag}`));
    expect(offenders, "wrap tags in backticks, e.g. `<html>`").toEqual([]);
  });
});
