import type { ComponentProps } from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Accordion root (value, multiple, defaultValue, onValueChange). */
const Accordion = AccordionPrimitive.Root;

/** Row container; rules above the first row and between rows. */
function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cnState("border-b border-yorha-border first:border-t", className)}
      {...props}
    />
  );
}

/** Heading wrapper (h3 by default, as Base UI renders it). */
function AccordionHeader({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Header>) {
  return <AccordionPrimitive.Header data-slot="accordion-header" className={cnState("m-0", className)} {...props} />;
}

/**
 * Header row button. Square bullet is hollow when closed and filled when open (currentColor).
 * Open rows wipe a dark fill left→right and flip text to on-ink, like the YoRHa selection row.
 */
function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Trigger
      data-slot="accordion-trigger"
      className={cnState(
        [
          "group/trigger flex w-full items-center gap-3 px-3 py-3 text-left",
          "font-yorha text-yorha-sm font-yorha-bold tracking-yorha-heading text-yorha-fg uppercase",
          "bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-left bg-no-repeat [background-size:0%_100%]",
          "transition-[background-size,color] duration-(--motion-select) ease-yorha-out",
          "data-[panel-open]:text-yorha-on-ink data-[panel-open]:[background-size:100%_100%]",
          "focus-visible:yorha-focus",
          "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-fg-muted",
        ],
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-yorha-bullet=""
        className="inline-block size-2 shrink-0 border border-current group-data-[panel-open]/trigger:bg-current"
      />
      <span className="flex-1">{children}</span>
    </AccordionPrimitive.Trigger>
  );
}

/** Body; height animates with --motion-collapse (exit --motion-select) via yorha-collapse and is instant under reduced/off motion. */
function AccordionPanel({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Panel>) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className={cnState("yorha-collapse px-7 font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg", className)}
      {...props}
    />
  );
}

export { Accordion, AccordionHeader, AccordionItem, AccordionPanel, AccordionTrigger };
