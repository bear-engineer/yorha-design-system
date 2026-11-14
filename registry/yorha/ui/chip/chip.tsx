export interface ChipProps {
  label: string;
  capacity?: number;
  segments?: number;
  sizeLabel?: string;
  onRemove?: () => void;
  removeLabel?: string;
  selectable?: boolean;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  className?: string;
}

// RED stub: compiles, renders the wrong thing (no buttons, no aria-pressed).
export function Chip({ label }: ChipProps) {
  return <span>{label}</span>;
}
