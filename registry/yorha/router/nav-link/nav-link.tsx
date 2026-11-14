import type { NavLinkProps as RouterNavLinkProps } from "react-router";

export type NavLinkProps = Omit<RouterNavLinkProps, "className" | "style"> & { className?: string };

export function NavLink({ children }: NavLinkProps) {
  return <span>{typeof children === "function" ? null : children}</span>;
}
