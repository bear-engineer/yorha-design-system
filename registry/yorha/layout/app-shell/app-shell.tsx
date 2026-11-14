// RED stub: compiles, renders the wrong thing so the play tests fail on assertions.
import type { ReactNode } from "react";

export interface AppShellProps {
  header?: ReactNode;
  nav?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  grid?: ReactNode;
  vignette?: ReactNode;
  navToggleLabel?: string;
  className?: string;
}

export function AppShell({ children }: AppShellProps) {
  return <div>{children}</div>;
}
