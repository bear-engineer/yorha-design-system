import { DocsContainer, type DocsContainerProps } from "@storybook/addon-docs/blocks";
import { type PropsWithChildren, useEffect, useRef } from "react";
import { addons } from "storybook/preview-api";
import { themes } from "storybook/theming";
import { useDocsGlobals } from "../../.storybook/docs-globals";

/** Storybook's light docs theme with a muted text colour that passes AA on white (default #73828C does not). */
const LIGHT_THEME = { ...themes.light, textMutedColor: "#566069" };

/**
 * Docs chrome follows the toolbar theme: the page ground is the kit ground (tokens `--yorha-bg`) so dark and
 * high-contrast frames sit on their own colour instead of a white canvas. Values are the sRGB of the generated tokens;
 * Storybook's theme colours go through colour maths and cannot take `var()`.
 */
const DOCS_THEMES: Record<string, typeof LIGHT_THEME> = {
  dark: {
    ...themes.dark,
    appBg: "#302e29",
    appContentBg: "#302e29",
    appPreviewBg: "#302e29",
    appBorderColor: "#8c8878",
    textColor: "#cec9b1",
    textMutedColor: "#b3ae98",
    barBg: "#3f3d36",
    inputBg: "#3f3d36",
    inputBorder: "#8c8878",
    inputTextColor: "#cec9b1",
  },
  "high-contrast": {
    ...themes.light,
    textMutedColor: "#4a4a42",
    appBg: "#ebe7d6",
    appContentBg: "#ebe7d6",
    appPreviewBg: "#ebe7d6",
    appBorderColor: "#524f45",
    textColor: "#24231e",
    barBg: "#ebe7d6",
    inputBg: "#f3efe2",
  },
};

/**
 * Wraps every docs page (MDX and autodocs) in one `<main lang="ko">` landmark, so pages need no
 * landmark of their own and axe `landmark-one-main` / `region` stay quiet. Pages must not add a
 * second `<main>`; stories that render landmarks (layouts, blocks) are shown in iframes.
 */
export function YorhaDocsContainer({ children, ...props }: PropsWithChildren<DocsContainerProps>) {
  const ref = useRef<HTMLElement>(null);
  const { theme } = useDocsGlobals(addons.getChannel());

  useEffect(() => {
    // Storybook's iframe.html has no lang; some docs pages never get one from a story (axe html-has-lang).
    const html = document.documentElement;
    if (!html.getAttribute("lang")) html.setAttribute("lang", "ko");

    // The object control (react-json-tree) renders <li> rows under divs. Drop their list semantics
    // instead of faking a list (axe `listitem`); the tree stays readable as plain text rows.
    const root = ref.current;
    if (!root) return;
    const fix = () => {
      for (const li of root.querySelectorAll("li:not([role])")) {
        const parent = li.parentElement;
        if (parent && !["UL", "OL", "MENU"].includes(parent.tagName)) li.setAttribute("role", "none");
      }
    };
    // Storybook stamps lang="en" on its docs wrapper and on every inline story wrapper, which would make Hangul
    // headings inherit the Latin-only tracking/case rule. Story content and the page are Korean; its own
    // chrome (arg tables, buttons) keeps its explicit lang="en".
    const korean = () => {
      root.closest(".sbdocs-content")?.setAttribute("lang", "ko");
      for (const el of root.querySelectorAll('[id^="story--"][lang="en"]')) el.setAttribute("lang", "ko");
    };
    korean();
    fix();
    const observer = new MutationObserver(() => {
      fix();
      korean();
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <DocsContainer {...props} theme={DOCS_THEMES[theme] ?? LIGHT_THEME}>
      <main lang="ko" ref={ref}>
        {children}
      </main>
    </DocsContainer>
  );
}
