import { useEffect, useRef, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { OTPFieldInput, OTPFieldRoot } from "@/components/ui/otp-field";
import { Panel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { ToastProvider, useToast } from "@/components/ui/toast";

const ZONES = ["벙커", "사막 구역", "공장 지대", "아카이브"];
const OTP_LENGTH = 6;

type FieldName = "name" | "zone" | "otp";
type Errors = Partial<Record<FieldName, string>>;

const LABEL: Record<FieldName, string> = { name: "유닛 이름", zone: "구역", otp: "인증 코드" };
const ANCHOR: Record<FieldName, string> = { name: "settings-name", zone: "settings-zone", otp: "settings-otp" };

export function meta() {
  return [{ title: "유닛 설정 | YoRHa 데모" }];
}

function validate(values: { name: string; zone: string | null; otp: string }): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = "이름을 2자 이상 입력하세요.";
  if (!values.zone) errors.zone = "구역을 선택하세요.";
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(values.otp)) errors.otp = `인증 코드 ${OTP_LENGTH}자리를 모두 입력하세요.`;
  return errors;
}

function focusControl(name: FieldName) {
  const root = document.getElementById(ANCHOR[name]);
  const target = root?.matches("input,button") ? root : root?.querySelector<HTMLElement>("input,button");
  target?.focus();
}

function SettingsFormBody() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [zone, setZone] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [notify, setNotify] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [rejected, setRejected] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);
  // Invalid submit: the summary takes focus so the list of problems is read first.
  useEffect(() => {
    if (rejected > 0) summaryRef.current?.focus();
  }, [rejected]);

  const errorNames = (Object.keys(errors) as FieldName[]).filter((key) => errors[key]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const next = validate({ name, zone, otp });
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setRejected((count) => count + 1);
      return;
    }
    setSubmitting(true);
    // Stand-in for the real request.
    timer.current = setTimeout(() => {
      setSubmitting(false);
      toast.add({ type: "success", title: "저장 완료", description: "유닛 설정을 저장했습니다.", timeout: 4000 });
    }, 700);
  }

  return (
    <Form aria-busy={submitting} noValidate onSubmit={onSubmit}>
      {errorNames.length > 0 ? (
        <div
          ref={summaryRef}
          role="group"
          tabIndex={-1}
          aria-labelledby="settings-error-title"
          className="flex flex-col gap-2 rounded-yorha border border-yorha-alert-ui bg-yorha-panel p-4 outline-none focus-visible:yorha-focus"
        >
          <p id="settings-error-title" className="m-0 font-yorha-bold text-yorha-alert">
            입력을 확인하세요 ({errorNames.length}건)
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-yorha-sm">
            {errorNames.map((key) => (
              <li key={key}>
                <a
                  href={`#${ANCHOR[key]}`}
                  onClick={(event) => {
                    event.preventDefault();
                    focusControl(key);
                  }}
                  className="rounded-yorha text-yorha-fg underline focus-visible:yorha-focus"
                >
                  {LABEL[key]}: {errors[key]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Field name="name" invalid={Boolean(errors.name)} disabled={submitting}>
        <FieldLabel>유닛 이름</FieldLabel>
        <FieldControl id={ANCHOR.name} value={name} onValueChange={setName} autoComplete="off" placeholder="예: 2B" />
        <FieldDescription>표시 이름, 2자 이상</FieldDescription>
        {errors.name ? <FieldError>{errors.name}</FieldError> : null}
      </Field>

      <Field name="zone" invalid={Boolean(errors.zone)} disabled={submitting}>
        <FieldLabel>구역</FieldLabel>
        <Combobox items={ZONES} value={zone} onValueChange={(value) => setZone(value as string | null)}>
          <ComboboxInputGroup>
            <ComboboxInput id={ANCHOR.zone} placeholder="구역 선택" />
            <ComboboxTrigger />
          </ComboboxInputGroup>
          <ComboboxContent>
            <ComboboxEmpty>일치하는 구역이 없습니다</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {errors.zone ? <FieldError>{errors.zone}</FieldError> : null}
      </Field>

      <Field name="otp" invalid={Boolean(errors.otp)} disabled={submitting}>
        <FieldLabel>인증 코드</FieldLabel>
        <OTPFieldRoot id={ANCHOR.otp} length={OTP_LENGTH} value={otp} onValueChange={setOtp}>
          {Array.from({ length: OTP_LENGTH }, (_, i) => (
            <OTPFieldInput
              key={i}
              {...(i === 0
                ? {}
                : {
                    // Field labels every slot via aria-labelledby, which beats aria-label: point slots 2..n at themselves so they keep their own name.
                    id: `${ANCHOR.otp}-${i + 1}`,
                    "aria-labelledby": `${ANCHOR.otp}-${i + 1}`,
                    "aria-label": `${i + 1}번째 자리 (총 ${OTP_LENGTH})`,
                  })}
            />
          ))}
        </OTPFieldRoot>
        <FieldDescription>문자로 받은 6자리 숫자</FieldDescription>
        {errors.otp ? <FieldError>{errors.otp}</FieldError> : null}
      </Field>

      <Switch checked={notify} onCheckedChange={setNotify} disabled={submitting}>
        알림 받기
      </Switch>

      <div className="flex items-center gap-3">
        {/* aria-disabled instead of disabled: the button keeps focus while the request runs. */}
        <Button type="submit" variant="primary" aria-disabled={submitting} loading={submitting}>
          {submitting ? "저장 중…" : "저장"}
        </Button>
      </div>
    </Form>
  );
}

/**
 * 설정 폼 블록. 라우트 모듈(app/routes/settings-form.tsx)로 복사해 쓴다.
 * 검증은 제출 시점에 한 번: 실패하면 오류 요약으로 포커스가 가고, 성공하면 토스트가 뜬다.
 */
export default function SettingsFormRoute() {
  return (
    <ToastProvider>
      <main aria-label="본문" lang="ko" className="min-h-dvh w-full min-w-0 bg-yorha-bg pb-8 text-yorha-fg">
        <PageHeader eyebrow="SEC-13" title="유닛 설정" description="이름, 구역, 인증 코드를 입력하고 저장합니다." />
        <div className="grid grid-cols-1 items-start gap-4 px-6 pt-4 lg:grid-cols-[minmax(0,40rem)_minmax(0,20rem)]">
          <Panel data-slot="form-panel" title="기본 정보" titleLevel={2}>
            <SettingsFormBody />
          </Panel>
          <Panel title="입력 안내" titleLevel={2}>
            <ul className="m-0 flex list-none flex-col gap-3 p-0 text-yorha-sm text-yorha-fg-soft">
              <li>이름은 2자 이상이며 유닛 목록과 기록에 표시됩니다.</li>
              <li>구역은 저장한 뒤에도 언제든 바꿀 수 있습니다.</li>
              <li>인증 코드는 문자로 받은 6자리 숫자입니다.</li>
            </ul>
          </Panel>
        </div>
      </main>
    </ToastProvider>
  );
}
