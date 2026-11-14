export function X() {
  // lint-allow layout-transition: Base UI collapsible panel height is measured by the library.
  return <div className="transition-[height,opacity] duration-(--motion-select) focus-visible:yorha-focus">x</div>;
}
