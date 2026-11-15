import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Measure, paragraph gap and body leading come from base (.yorha-prose, --yorha-measure, --yorha-paragraph-gap).
// line-height is set here, not inherited from body: body's unitless value is resolved before :lang applies,
// so the CJK leading only takes effect when the prose element itself resolves var(--yorha-leading-body).
const ROOT =
  "yorha-prose font-yorha text-yorha-base text-yorha-fg [line-height:var(--yorha-leading-body)] " +
  "[&:lang(ja)]:[line-break:strict] " +
  // headings: Latin uppercase tracked, Korean keeps case and normal tracking (matches Heading)
  "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-yorha-bold [&_h2]:text-yorha-xl [&_h2]:uppercase [&_h2]:tracking-yorha-heading " +
  "[&:lang(ko)_h2]:normal-case [&:lang(ko)_h2]:tracking-yorha-body " +
  // h3/h4 use the same case and tracking pair as Heading (FTXT-03)
  "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-yorha-bold [&_h3]:text-yorha-lg [&_h3]:uppercase [&_h3]:tracking-yorha-heading " +
  "[&:lang(ko)_h3]:normal-case [&:lang(ko)_h3]:tracking-yorha-body " +
  "[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:font-yorha-bold [&_h4]:text-yorha-base [&_h4]:uppercase [&_h4]:tracking-yorha-heading " +
  "[&:lang(ko)_h4]:normal-case [&:lang(ko)_h4]:tracking-yorha-body " +
  // lists: nested lists get a 4px rhythm, only the outer list takes the 16px block margin (FTXT-10)
  "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-1 " +
  "[&_li_ul]:my-1 [&_li_ol]:my-1 " +
  // blockquote
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-yorha-border [&_blockquote]:pl-4 [&_blockquote]:text-yorha-fg-muted " +
  // inline code and preformatted blocks: wrap instead of scrolling, so no unfocusable scroll region
  "[&_code]:rounded-yorha [&_code]:bg-yorha-control [&_code]:px-1 [&_code]:font-yorha-mono [&_code]:text-yorha-sm [&_code]:text-yorha-on-control " +
  "[&_pre]:my-4 [&_pre]:border [&_pre]:border-yorha-border [&_pre]:p-3 [&_pre]:font-yorha-mono [&_pre]:text-yorha-sm " +
  "[&_pre]:whitespace-pre-wrap [&_pre]:[overflow-wrap:anywhere] " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-current " +
  // links: always underlined, so colour is not the only cue
  "[&_a]:text-yorha-fg-strong [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-4";

export type ProseProps = HTMLAttributes<HTMLDivElement>;

/** Long-form text container. Set `lang` on it (or an ancestor) to pick the ko/ja/en line-breaking rules. */
export function Prose({ className, ...rest }: ProseProps) {
  return <div className={cn(ROOT, className)} {...rest} />;
}

export interface ProseTableProps extends ComponentProps<"table"> {
  /** Accessible name of the keyboard-focusable scroll region. Required. */
  label: string;
  caption?: ReactNode;
}

/**
 * Table inside Prose. The wrapper is the scroll region: it is focusable (tabIndex 0) and labelled,
 * so keyboard users can scroll a wide table. Numerals use tabular figures.
 */
export function ProseTable({ label, caption, className, children, ...rest }: ProseTableProps) {
  const regionRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  // The region is a tab stop only while the table is wider than it (V4-264).
  useLayoutEffect(() => {
    const region = regionRef.current;
    const table = tableRef.current;
    if (!region || !table) return;
    const measure = () => setOverflowing(region.scrollWidth > region.clientWidth + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(region);
    ro.observe(table);
    return () => ro.disconnect();
  }, []);

  // Dev only: a <th> without scope is ambiguous for screen readers (V4-268).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const table = tableRef.current;
    if (!table) return;
    const bad = Array.from(table.querySelectorAll("th")).filter((th) => !th.hasAttribute("scope"));
    if (bad.length > 0) console.warn(`ProseTable "${label}": ${bad.length} <th> without scope. Add scope="col" or scope="row".`);
  }, [label]);

  return (
    <div
      ref={regionRef}
      data-slot="prose-table-scroll"
      data-overflow={overflowing ? "" : undefined}
      role="region"
      aria-label={label}
      tabIndex={overflowing ? 0 : undefined}
      className="yorha-scroll-cue-x my-4 w-full overflow-x-auto rounded-yorha"
    >
      <table
        ref={tableRef}
        className={cn(
          "yorha-tabular w-full border-collapse text-left text-yorha-sm",
          "[&_th]:border-b [&_th]:border-yorha-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-yorha-bold [&_th]:whitespace-nowrap",
          "[&_td]:border-b [&_td]:border-yorha-border [&_td]:px-2 [&_td]:py-1.5",
          "[&_caption]:mb-2 [&_caption]:text-left [&_caption]:font-yorha-bold [&_caption]:uppercase [&_caption]:tracking-yorha-heading",
          className,
        )}
        {...rest}
      >
        {caption ? <caption>{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}
