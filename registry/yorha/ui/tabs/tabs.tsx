import type { ReactNode } from "react";

// RED stub: compiles, renders the wrong thing (no tablist/tab roles, no tabpanel labelling).
type P = { children?: ReactNode; className?: string; value?: string; defaultValue?: string; "aria-label"?: string };
export const Tabs = ({ children }: P) => <div>{children}</div>;
export const TabsList = ({ children }: P) => <div>{children}</div>;
export const TabsTab = ({ children }: P) => <span>{children}</span>;
export const TabsPanel = ({ children }: P) => <div>{children}</div>;
