import { useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Container } from "@/components/container";
import { Stack } from "@/components/stack";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  /** Content of the dark header strip (banner landmark). */
  header?: ReactNode;
  /** Navigation, usually <Sidebar/>. Collapses behind the menu button below the lg container width. */
  nav?: ReactNode;
  /** Main content (main landmark). */
  children: ReactNode;
  footer?: ReactNode;
  /** Decorative slot, e.g. <GridBackground/>. Rendered behind the content. */
  grid?: ReactNode;
  /** Decorative slot, e.g. <Vignette/>. Rendered behind the content. */
  vignette?: ReactNode;
  /** Visible label of the mobile disclosure button. Default 메뉴. */
  navToggleLabel?: string;
  className?: string;
}

// Collapse is driven by the shell's own container width (@container), not the viewport,
// so a narrow frame collapses the nav the same way a narrow window does.
const ROOT = "@container relative flex min-h-dvh flex-col bg-yorha-bg text-yorha-fg";
const SKIP =
  "sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-2 focus-visible:top-2 focus-visible:z-(--yorha-z-decor) " +
  "focus-visible:bg-yorha-ink focus-visible:px-3 focus-visible:py-2 focus-visible:text-yorha-on-ink focus-visible:yorha-focus";
const HEADER = "flex items-center gap-3 bg-yorha-ink px-4 py-2 text-yorha-on-ink";
const TOGGLE =
  "@lg:hidden ml-auto border border-yorha-on-ink px-3 py-1 text-yorha-sm uppercase tracking-yorha-wide " +
  "focus-visible:yorha-focus";

export function AppShell({
  header,
  nav,
  children,
  footer,
  grid,
  vignette,
  navToggleLabel = "메뉴",
  className,
}: AppShellProps) {
  const baseId = useId();
  const mainId = `${baseId}-main`;
  const navId = `${baseId}-nav`;
  const mainRef = useRef<HTMLElement>(null);
  const [navOpen, setNavOpen] = useState(false);

  // Skip link moves focus to <main> itself (tabIndex -1), not just the scroll position.
  const skipToMain = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    mainRef.current?.focus();
  };

  return (
    <Stack as="div" gap={0} className={cn(ROOT, className)}>
      <a href={`#${mainId}`} onClick={skipToMain} className={SKIP}>
        본문으로 건너뛰기
      </a>
      {grid}
      {vignette}
      <header aria-label="사이트 헤더" className={cn(HEADER, "relative")}>
        {header}
        {nav && (
          <button
            type="button"
            aria-expanded={navOpen}
            aria-controls={navId}
            onClick={() => setNavOpen((open) => !open)}
            className={TOGGLE}
          >
            {navToggleLabel}
          </button>
        )}
      </header>
      <div className="relative flex flex-1 flex-col @lg:flex-row">
        {nav && (
          <div
            id={navId}
            data-slot="app-shell-nav"
            data-open={navOpen ? "true" : undefined}
            className={cn("shrink-0 @lg:w-64", !navOpen && "@max-lg:hidden")}
          >
            {nav}
          </div>
        )}
        <main
          id={mainId}
          ref={mainRef}
          tabIndex={-1}
          aria-label="본문"
          className="relative min-w-0 flex-1 py-6"
        >
          <Container size="lg">{children}</Container>
        </main>
      </div>
      {footer && (
        <footer aria-label="하단 정보" className="relative border-t border-yorha-border px-4 py-3">
          {footer}
        </footer>
      )}
    </Stack>
  );
}
