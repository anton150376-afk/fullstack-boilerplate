import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TextInput, View } from "react-native";

import { Button } from "@boilerplate/ui-native";

import { api } from "../lib/api.js";

// Фаза 12.3 задания — сквозная проверка шаблона: мобильный экран для
// отдельной сущности (не "Заметки"), которого у показательной сущности
// никогда не было (apps/web/src/routes/admin/notes.tsx есть, мобильного
// эквивалента — нет). Тот же contract/api-client, что у web, те же
// хуки @tanstack/react-query — общий слой между платформами на практике,
// не только в документации (docs/architecture/overview.md).
export default function TasksScreen() {
  const { t } = useTranslation("tasks");
  const { data: tasks } = useSuspenseQuery(api.tasks.list.queryOptions());
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: api.tasks.list.queryKey() });

  const createTask = useMutation(
    api.tasks.create.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setTitle("");
      },
    }),
  );

  const toggleTask = useMutation(
    api.tasks.toggle.mutationOptions({
      onSuccess: () => {
        void invalidate();
      },
    }),
  );

  const removeTask = useMutation(
    api.tasks.remove.mutationOptions({
      onSuccess: () => {
        void invalidate();
      },
    }),
  );

  return (
    <View className="flex-1 gap-4 bg-background p-6">
      <Text className="text-2xl font-semibold text-foreground">{t("title")}</Text>
      <Text className="text-muted-foreground" testID="tasks-count">
        {t("count", { count: tasks.length })}
      </Text>

      <View className="gap-1" testID="tasks-list">
        {tasks.length === 0 && <Text className="text-muted-foreground">{t("emptyLabel")}</Text>}
        {tasks.map((task) => (
          <View
            key={task.id}
            className="flex flex-row items-center justify-between rounded-md border border-border bg-card p-3"
          >
            <Pressable
              className="flex-1 flex-row items-center gap-2"
              onPress={() => {
                toggleTask.mutate({ id: task.id });
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.done }}
            >
              <Text className="text-foreground">{task.done ? "☑" : "☐"}</Text>
              <Text className="text-foreground">{task.title}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                removeTask.mutate({ id: task.id });
              }}
            >
              <Text className="text-destructive">✕</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <TextInput
        accessibilityLabel={t("titleLabel")}
        placeholder={t("titleLabel")}
        className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
        value={title}
        onChangeText={setTitle}
      />
      <Button
        disabled={createTask.isPending || title.length === 0}
        onPress={() => {
          createTask.mutate({ title });
        }}
      >
        {t("addButton")}
      </Button>
    </View>
  );
}
