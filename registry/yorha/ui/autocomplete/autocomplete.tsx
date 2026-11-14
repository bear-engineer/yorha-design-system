import { Autocomplete as P } from "@base-ui/react/autocomplete";
export const Autocomplete = P.Root;
export const AutocompleteInputGroup = P.InputGroup;
export const AutocompleteInput = P.Input;
export const AutocompleteTrigger = P.Trigger;
export const AutocompleteIcon = P.Icon;
export const AutocompleteClear = P.Clear;
export const AutocompleteValue = P.Value;
export const AutocompleteList = P.List;
export const AutocompleteEmpty = P.Empty;
export const AutocompleteStatus = P.Status;
export const AutocompleteCollection = P.Collection;
export const AutocompleteRow = P.Row;
export const AutocompleteItem = P.Item;
export const AutocompleteGroup = P.Group;
export const AutocompleteGroupLabel = P.GroupLabel;
export const AutocompleteSeparator = P.Separator;
export const AutocompleteBackdrop = P.Backdrop;
export const AutocompleteArrow = P.Arrow;
export const useAutocompleteFilter = P.useFilter;
export function AutocompleteContent({ children }: { children?: React.ReactNode; container?: HTMLElement | null; className?: string }) {
  return (
    <P.Portal>
      <P.Positioner>
        <P.Popup>{children}</P.Popup>
      </P.Positioner>
    </P.Portal>
  );
}
