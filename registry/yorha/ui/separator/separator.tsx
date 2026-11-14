import type { ComponentProps } from "react";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cnState } from "@/lib/utils";

/**
 * Accessible separator (role=separator) on Base UI Separator, drawn as a 1px YoRHa rule.
 * The decorative divider in Ornament is a separate, non-semantic element.
 */
function Separator({ className, ...props }: ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      className={cnState(
        [
          "shrink-0 bg-yorha-separator",
          "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch",
        ],
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
