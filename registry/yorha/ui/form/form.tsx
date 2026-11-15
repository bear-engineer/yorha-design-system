import * as React from "react";
import { Form as BaseForm } from "@base-ui/react/form";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BaseFormProps = React.ComponentProps<typeof BaseForm>;
type FormValues = Record<string, unknown>;
/** Server-style errors keyed by Field name; a returned or rejected map is shown under the matching fields. */
type ErrorMap = Record<string, string | string[]>;

export interface FormProps extends Omit<BaseFormProps, "className" | "onFormSubmit"> {
  className?: string;
  /**
   * Runs with the form values once validation passes. It may return a Promise: while it is pending the form has `data-pending`, FormSubmit
   * shows its loading state, and further submits (Enter twice, double click) are ignored. A resolved or rejected error map
   * (`{ fieldName: message }`) goes to `errors` and focuses the first invalid field.
   */
  onFormSubmit?: (values: FormValues, event: Parameters<NonNullable<BaseFormProps["onFormSubmit"]>>[1]) => void | ErrorMap | Promise<void | ErrorMap>;
}

const FormPendingContext = React.createContext(false);

const isThenable = (v: unknown): v is PromiseLike<unknown> => typeof (v as { then?: unknown } | null)?.then === "function";
const isMap = (v: unknown): v is ErrorMap => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Native form with consolidated errors. Put Field.Root (name=...) around each control:
 * - `errors` (e.g. from a server response, keyed by Field name) shows under that Field and sets aria-invalid.
 *   Clearing it is the caller's job: pass a new `errors` object after the next submit. Errors returned by an async onFormSubmit are merged
 *   in and replaced by the next submit.
 * - Submitting with invalid fields keeps onFormSubmit from running and focuses the first invalid control.
 * - onFormSubmit receives the form values; call event.preventDefault() yourself if you submit elsewhere (async handlers: the native submit
 *   is cancelled for you, a Promise means you are submitting through script).
 */
export const Form = React.forwardRef<HTMLFormElement, FormProps>(function Form({ className, onFormSubmit, errors, ...props }, ref) {
  const [pending, setPending] = React.useState(false);
  const pendingRef = React.useRef(false);
  const [serverErrors, setServerErrors] = React.useState<ErrorMap | undefined>();
  const [focusTick, setFocusTick] = React.useState(0);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const setRefs = (node: HTMLFormElement | null) => {
    formRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };
  React.useEffect(() => {
    if (!focusTick) return;
    formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [focusTick]);
  const finish = (map: unknown) => {
    pendingRef.current = false;
    setPending(false);
    if (isMap(map) && Object.keys(map).length) {
      setServerErrors(map);
      setFocusTick((n) => n + 1);
    }
  };
  return (
    <FormPendingContext.Provider value={pending}>
      <BaseForm
        ref={setRefs}
        data-pending={pending ? "" : undefined}
        aria-busy={pending ? true : undefined}
        className={cn("flex flex-col gap-6 font-yorha text-yorha-base text-yorha-fg", className)}
        errors={serverErrors || errors ? { ...errors, ...serverErrors } : undefined}
        // Capture phase: a second submit while pending never reaches validation or the handler.
        onSubmitCapture={(e) => {
          props.onSubmitCapture?.(e);
          if (pendingRef.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onFormSubmit={
          onFormSubmit
            ? (values, details) => {
                setServerErrors(undefined);
                let result: ReturnType<NonNullable<FormProps["onFormSubmit"]>>;
                try {
                  result = onFormSubmit(values, details);
                } catch (err) {
                  finish(isMap(err) ? err : undefined);
                  throw err;
                }
                if (isThenable(result)) {
                  details.event.preventDefault();
                  pendingRef.current = true;
                  setPending(true);
                  void Promise.resolve(result).then(finish, (err: unknown) => finish(err));
                } else if (isMap(result)) {
                  finish(result);
                }
              }
            : undefined
        }
        {...props}
      />
    </FormPendingContext.Provider>
  );
});

export type FormSubmitProps = Omit<ButtonProps, "variant" | "type" | "className"> & { className?: string };

/** Primary submit button: the shared Button (control scale, press, busy), `type="submit"`. It shows `loading` while the form's async submit is pending. */
export const FormSubmit = React.forwardRef<HTMLButtonElement, FormSubmitProps>(function FormSubmit({ className, loading, ...props }, ref) {
  const pending = React.useContext(FormPendingContext);
  return <Button ref={ref} type="submit" variant="primary" loading={loading ?? pending} className={cn("h-control-md", className)} {...props} />;
});
