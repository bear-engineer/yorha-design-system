import type { ReactNode } from "react";

export interface CardProps {
  title: ReactNode;
  meta?: ReactNode;
  media?: ReactNode;
  actions?: ReactNode;
  href?: string;
  className?: string;
}

// RED stub: compiles, renders the wrong thing (no link, no actions region).
export function Card({ title }: CardProps) {
  return <div>{title}</div>;
}
