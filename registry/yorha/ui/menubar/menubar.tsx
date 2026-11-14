import type { ComponentProps } from "react";
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubTrigger,
  useMenuIsSub,
} from "@/components/ui/menu";
import { cnState } from "@/lib/utils";

/**
 * Desktop-app style bar of menus. One tab stop; Left/Right move between triggers, Down opens,
 * and once a menu is open, Left/Right or hovering another trigger switches menus. Escape closes.
 */
function Menubar({ className, ...props }: ComponentProps<typeof MenubarPrimitive>) {
  return (
    <MenubarPrimitive
      data-slot="menubar"
      className={cnState(
        "inline-flex items-center gap-1 border border-yorha-border bg-yorha-panel p-1 font-yorha text-yorha-fg rounded-yorha",
        className,
      )}
      {...props}
    />
  );
}

/** One menu in the bar: wrap a `MenubarTrigger` and a `MenubarContent`. */
const MenubarMenu = MenuPrimitive.Root;

/** Bar button that opens its menu; stays filled while the menu is open. */
function MenubarTrigger({ className, ...props }: ComponentProps<typeof MenuPrimitive.Trigger>) {
  return (
    <MenuPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cnState(
        [
          "inline-flex h-control-sm cursor-default select-none items-center px-pad-sm text-yorha-sm tracking-yorha-wide text-yorha-fg",
          "bg-linear-to-r from-yorha-ink to-yorha-ink bg-no-repeat bg-[position:left_center] bg-[length:0%_100%]",
          "yorha-wipe [--yorha-wipe-exit:0s]",
          "hover:bg-[length:100%_100%] hover:text-yorha-on-ink data-[popup-open]:bg-[length:100%_100%] data-[popup-open]:text-yorha-on-ink",
          "focus-visible:yorha-focus data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-disabled",
        ],
        className,
      )}
      {...props}
    />
  );
}

// The gap is measured from the bar, not from the trigger: bar padding (4) + border (1) + 8 = 13 from the trigger's bottom.
const BAR_GAP = 13;

/** Popup 8px under the bar; same rows as Menu. Submenus inside it open to the side like Menu's. */
function MenubarContent({ sideOffset, ...props }: ComponentProps<typeof MenuContent>) {
  const nested = useMenuIsSub();
  return <MenuContent sideOffset={sideOffset ?? (nested ? undefined : BAR_GAP)} {...props} />;
}

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenuItem as MenubarItem,
  MenuCheckboxItem as MenubarCheckboxItem,
  MenuRadioGroup as MenubarRadioGroup,
  MenuRadioItem as MenubarRadioItem,
  MenuGroup as MenubarGroup,
  MenuLabel as MenubarLabel,
  MenuSeparator as MenubarSeparator,
  MenuShortcut as MenubarShortcut,
  MenuSub as MenubarSub,
  MenuSubTrigger as MenubarSubTrigger,
};
