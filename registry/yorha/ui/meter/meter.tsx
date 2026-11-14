// RED stub: renders the wrong thing on purpose so the play tests fail on assertions.
export interface MeterProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
}

export function Meter({ label }: MeterProps) {
  return <div role="img" aria-label={label}>stub</div>;
}
