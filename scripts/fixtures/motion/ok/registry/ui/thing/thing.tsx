// A comment may mention 180ms, cubic-bezier(0.2, 0, 0, 1) or transition-all without tripping the rule.
const TYPEAHEAD_RESET_MS = 500;
/* Block comments too: 400ms. */
export function X() {
  return (
    <button
      data-reset={TYPEAHEAD_RESET_MS}
      className="yorha-pop yorha-press bg-yorha-ink transition-[opacity,scale] duration-(--motion-popover) ease-yorha-emphasized focus-visible:yorha-focus"
      style={{ transitionDelay: "calc(var(--motion-stagger) * 2)" }}
    >
      x
    </button>
  );
}
