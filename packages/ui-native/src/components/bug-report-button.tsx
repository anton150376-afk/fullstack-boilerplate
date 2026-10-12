import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { defaultBugReportLabels, resolveLabels, type BugReportLabels } from "@boilerplate/ui-core";

export interface BugReportFormValues {
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  screenshot?: string;
}

export interface BugReportButtonProps {
  /** apps/mobile передаёт отправку на /dev/bug-reports, дополняя значения формы остальным контекстом. */
  onSubmit: (values: BugReportFormValues) => Promise<void>;
  /**
   * react-native-view-shot на стороне apps/mobile (captureRef корневого
   * view) — вызывается автоматически перед открытием формы, снимок
   * экрана на native честный и не требует действия пользователя
   * (в отличие от ui-web, где кнопка «приложить» без автоматики —
   * расхождение описано в таблице паритета docs/packages/ui.md).
   */
  captureScreenshot: () => Promise<string | undefined>;
  label?: string;
  /** Подписи; незаданные остаются русскими (docs/packages/ui.md). */
  labels?: Partial<BugReportLabels>;
}

type Status = "idle" | "submitting" | "success" | "error";

// Плавающая кнопка «сообщить о проблеме» (раздел "Фаза 9" задания,
// пункт 9.2) — рендерится безусловно, флагом управляет вызывающий код
// (apps/mobile читает EXPO_PUBLIC_ENABLE_BUG_REPORTS). Компонент не
// знает про @boilerplate/devtools/api-client (правило ui.md) — отдаёт
// наружу только то, что собрал сам: три текстовых поля и снимок экрана.
export function BugReportButton({
  onSubmit,
  captureScreenshot,
  label,
  labels,
}: BugReportButtonProps) {
  const text = resolveLabels(defaultBugReportLabels, labels);
  const title = label ?? text.title;
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [screenshot, setScreenshot] = useState<string | undefined>(undefined);

  function reset(): void {
    setStatus("idle");
    setError(undefined);
    setDescription("");
    setStepsToReproduce("");
    setExpectedBehavior("");
    setScreenshot(undefined);
  }

  async function openForm(): Promise<void> {
    const captured = await captureScreenshot();
    setScreenshot(captured);
    setVisible(true);
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

  return (
    <>
      <Pressable
        className="absolute right-4 bottom-4 z-50 rounded-full bg-primary px-4 py-2"
        accessibilityRole="button"
        onPress={() => void openForm()}
      >
        <Text className="text-sm font-medium text-primary-foreground">{title}</Text>
      </Pressable>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setVisible(false);
          reset();
        }}
      >
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView className="rounded-t-md bg-background p-4">
            <Text className="text-base font-medium text-foreground">{title}</Text>
            {status === "success" ? (
              <Text className="mt-4 text-sm text-foreground">{text.success}</Text>
            ) : (
              <View className="mt-4 flex flex-col gap-3">
                <View className="flex flex-col gap-1">
                  <Text className="text-sm font-medium text-foreground">{text.description}</Text>
                  <TextInput
                    accessibilityLabel={text.description}
                    multiline
                    className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
                <View className="flex flex-col gap-1">
                  <Text className="text-sm font-medium text-foreground">
                    {text.stepsToReproduce}
                  </Text>
                  <TextInput
                    accessibilityLabel={text.stepsToReproduce}
                    multiline
                    className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    value={stepsToReproduce}
                    onChangeText={setStepsToReproduce}
                  />
                </View>
                <View className="flex flex-col gap-1">
                  <Text className="text-sm font-medium text-foreground">
                    {text.expectedBehavior}
                  </Text>
                  <TextInput
                    accessibilityLabel={text.expectedBehavior}
                    multiline
                    className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
                    value={expectedBehavior}
                    onChangeText={setExpectedBehavior}
                  />
                </View>
                {screenshot && (
                  <Text className="text-xs text-muted-foreground">
                    {text.screenshotAttachedAuto}
                  </Text>
                )}
                {status === "error" && error && (
                  <Text accessibilityRole="alert" className="text-sm text-destructive">
                    {error}
                  </Text>
                )}
                <View className="flex flex-row justify-end gap-2">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setVisible(false);
                      reset();
                    }}
                  >
                    <Text className="px-3 py-2 text-sm text-foreground">{text.cancel}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={status === "submitting"}
                    onPress={() => void handleSubmit()}
                  >
                    <Text className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                      {text.submit}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
