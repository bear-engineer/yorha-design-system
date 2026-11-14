import { Combobox as P } from "@base-ui/react/combobox";
export const Combobox = P.Root;
export const ComboboxLabel = P.Label;
export const ComboboxInputGroup = P.InputGroup;
export const ComboboxInput = P.Input;
export const ComboboxTrigger = P.Trigger;
export const ComboboxIcon = P.Icon;
export const ComboboxClear = P.Clear;
export const ComboboxValue = P.Value;
export const ComboboxChips = P.Chips;
export const ComboboxChip = P.Chip;
export const ComboboxChipRemove = P.ChipRemove;
export const ComboboxList = P.List;
export const ComboboxEmpty = P.Empty;
export const ComboboxStatus = P.Status;
export const ComboboxCollection = P.Collection;
export const ComboboxRow = P.Row;
export const ComboboxItem = P.Item;
export const ComboboxItemIndicator = P.ItemIndicator;
export const ComboboxGroup = P.Group;
export const ComboboxGroupLabel = P.GroupLabel;
export const ComboboxSeparator = P.Separator;
export const ComboboxBackdrop = P.Backdrop;
export const ComboboxArrow = P.Arrow;
export const useComboboxFilter = P.useFilter;
export function ComboboxContent({ children }: { children?: React.ReactNode; container?: HTMLElement | null; className?: string }) {
  return (
    <P.Portal>
      <P.Positioner>
        <P.Popup>{children}</P.Popup>
      </P.Positioner>
    </P.Portal>
  );
}
