import { DocsContainer, type DocsContainerProps } from "@storybook/addon-docs/blocks";
import { type PropsWithChildren, useEffect, useRef } from "react";

/**
 * Wraps every docs page (MDX and autodocs) in one `<main lang="ko">` landmark, so pages need no
 * landmark of their own and axe `landmark-one-main` / `region` stay quiet. Pages must not add a
 * second `<main>`; stories that render landmarks (layouts, blocks) are shown in iframes.
 */
export function YorhaDocsContainer({ children, ...props }: PropsWithChildren<DocsContainerProps>) {
  const ref = useRef<HTMLElement>(null);

  // Storybook's object control (react-json-tree) renders <li> children directly under a <div>.
  // Give that div the list role so the markup is valid (axe `listitem`).
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const fix = () => {
      for (const tree of root.querySelectorAll(".rejt-tree:not([role])")) tree.setAttribute("role", "list");
    };
    fix();
    const observer = new MutationObserver(fix);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <DocsContainer {...props}>
      <main lang="ko" ref={ref}>
        {children}
      </main>
    </DocsContainer>
  );
}
