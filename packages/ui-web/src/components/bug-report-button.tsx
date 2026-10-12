import { Dialog } from "@base-ui/react/dialog";
import { useRef, useState } from "react";

import { defaultBugReportLabels, resolveLabels, type BugReportLabels } from "@boilerplate/ui-core";

import { Button } from "./button.js";

export interface BugReportFormValues {
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  screenshot?: string;
}

export interface BugReportButtonProps {
  /** apps/web передаёт отправку на /dev/bug-reports, дополняя значения формы остальным контекстом. */
  onSubmit: (values: BugReportFormValues) => Promise<void>;
  label?: string;
  /** Подписи; незаданные остаются русскими (docs/packages/ui.md). */
  labels?: Partial<BugReportLabels>;
}

type Status = "idle" | "submitting" | "success" | "error";

// Плавающая кнопка «сообщить о проблеме» (раздел "Фаза 9" задания,
// пункт 9.2) — рендерится безусловно, флагом управляет вызывающий код
// (apps/web читает VITE_ENABLE_BUG_REPORTS). Компонент не знает про
// @boilerplate/devtools/api-client (правило ui.md) — отдаёт наружу
// только то, что собрал сам: три текстовых поля и, по желанию, снимок.
// Снимок — кнопка «приложить» без автоматики: DOM-снимки врут на
// внешних шрифтах/canvas/кросс-доменных картинках (раздел 9.1 задания).
// У ui-native снимок автоматический (react-native-view-shot) —
// расхождение описано в таблице паритета docs/packages/ui.md.
export function BugReportButton({ onSubmit, label, labels }: BugReportButtonProps) {
  const text = resolveLabels(defaultBugReportLabels, labels);
  const title = label ?? text.title;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [screenshot, setScreenshot] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset(): void {
    setStatus("idle");
    setError(undefined);
    setDescription("");
    setStepsToReproduce("");
    setExpectedBehavior("");
    setScreenshot(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(): Promise<void> {
    setStatus("submitting");
    setError(undefined);
    try {
      await onSubmit({ description, stepsToReproduce, expectedBehavior, screenshot });
      setStatus("success");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : text.submitFailed);
    }
  }

  function handleScreenshotPicked(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.readAsDataURL(file);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <Dialog.Trigger className="fixed right-4 bottom-4 z-50 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
        {title}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-background p-4">
          <Dialog.Title className="text-base font-medium text-foreground">{title}</Dialog.Title>
          {status === "success" ? (
            <p className="mt-4 text-sm text-foreground">{text.success}</p>
          ) : (
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                {text.description}
                <textarea
                  required
                  className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                {text.stepsToReproduce}
                <textarea
                  className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={stepsToReproduce}
                  onChange={(event) => {
                    setStepsToReproduce(event.target.value);
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                {text.expectedBehavior}
                <textarea
                  className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={expectedBehavior}
                  onChange={(event) => {
                    setExpectedBehavior(event.target.value);
                  }}
                />
              </label>
              <div className="flex flex-col gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  aria-label={text.attachScreenshot}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleScreenshotPicked(file);
                    }
                  }}
                />
                {screenshot && (
                  <p className="text-xs text-muted-foreground">{text.screenshotAttached}</p>
                )}
              </div>
              {status === "error" && error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Dialog.Close className="rounded-md px-3 py-2 text-sm text-foreground">
                  {text.cancel}
                </Dialog.Close>
                <Button type="submit" disabled={status === "submitting"}>
                  {text.submit}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
