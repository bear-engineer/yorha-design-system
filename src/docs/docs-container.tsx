import { DocsContainer, type DocsContainerProps } from "@storybook/addon-docs/blocks";
import { type PropsWithChildren, useEffect, useRef } from "react";
import { themes } from "storybook/theming";

/** Storybook's light docs theme with a muted text colour that passes AA on white (default #73828C does not). */
const DOCS_THEME = { ...themes.light, textMutedColor: "#566069" };

/**
 * Wraps every docs page (MDX and autodocs) in one `<main lang="ko">` landmark, so pages need no
 * landmark of their own and axe `landmark-one-main` / `region` stay quiet. Pages must not add a
 * second `<main>`; stories that render landmarks (layouts, blocks) are shown in iframes.
 */
export function YorhaDocsContainer({ children, ...props }: PropsWithChildren<DocsContainerProps>) {
  const ref = useRef<HTMLElement>(null);

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
    <DocsContainer {...props} theme={DOCS_THEME}>
      <main lang="ko" ref={ref}>
        {children}
      </main>
    </DocsContainer>
  );
}
