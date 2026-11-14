// RED stub: compiles, deliberately wrong (no label/description/error wiring).
import type { ComponentProps, ReactNode } from "react";

export interface FieldFrameProps {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
  children?: ReactNode;
}

export function FieldFrame(props: FieldFrameProps) {
  return (
    <div>
      {props.label}
      {props.children}
      {props.description}
      {props.error}
    </div>
  );
}

export function Field(props: { children?: ReactNode; invalid?: boolean; disabled?: boolean; name?: string; className?: string }) {
  return <div>{props.children}</div>;
}

export function FieldLabel(props: { children?: ReactNode; className?: string }) {
  return <span>{props.children}</span>;
}

export function FieldDescription(props: { children?: ReactNode; className?: string }) {
  return <p>{props.children}</p>;
}

export function FieldError(props: { children?: ReactNode; className?: string; match?: boolean }) {
  return <p>{props.children}</p>;
}

export function FieldControl(props: ComponentProps<"input"> & { className?: string }) {
  return <input {...props} />;
}

export function Fieldset(props: { children?: ReactNode; className?: string }) {
  return <div>{props.children}</div>;
}

export function FieldsetLegend(props: { children?: ReactNode; className?: string }) {
  return <span>{props.children}</span>;
}
