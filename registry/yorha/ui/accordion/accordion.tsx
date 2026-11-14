import type { ReactNode } from "react";

// RED stub: compiles, renders the wrong thing (no buttons, no aria-expanded, panels always visible).
type P = { children?: ReactNode; className?: string; value?: string; multiple?: boolean; defaultValue?: unknown };
export const Accordion = ({ children }: P) => <div>{children}</div>;
export const AccordionItem = ({ children }: P) => <div>{children}</div>;
export const AccordionHeader = ({ children }: P) => <div>{children}</div>;
export const AccordionTrigger = ({ children }: P) => <span>{children}</span>;
export const AccordionPanel = ({ children }: P) => <div>{children}</div>;
