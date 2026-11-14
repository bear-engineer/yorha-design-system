// RED stub: renders the wrong thing on purpose so the play tests fail on assertions.
export interface ProgressProps {
  value?: number | null;
  max?: number;
  label?: string;
  segments?: number;
}

export function Progress({ label }: ProgressProps) {
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={0} aria-valuetext="0">
      stub
    </div>
  );
}
