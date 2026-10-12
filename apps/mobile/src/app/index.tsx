import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, TextInput, View } from "react-native";

import { Button } from "@boilerplate/ui-native";

import { LanguageSwitcher } from "../components/language-switcher.js";
import { api } from "../lib/api.js";

// Тот же contract/api-client, что apps/web/src/routes/index.tsx — общий
// слой между платформами (раздел "Фаза 7" задания: "общий слой — это
// контракт, клиент и хуки"), не код экрана: Suspense здесь, не SSR-загрузчик.
export default function NotesScreen() {
  const { t } = useTranslation("notes");
  const { data: notes } = useSuspenseQuery(api.notes.list.queryOptions());
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const createNote = useMutation(
    api.notes.create.mutationOptions({
      onSuccess: () => {
        // Как в apps/web: без этого созданная заметка уходила на сервер, а список
        // и счётчик оставались прежними до перезапуска (найдено на телефоне).
        void queryClient.invalidateQueries({ queryKey: api.notes.list.queryKey() });
        setTitle("");
        setBody("");
      },
    }),
  );

  return (
    <View className="flex-1 gap-4 bg-background p-6">
      <View className="flex flex-row items-center justify-between">
        <Text className="text-2xl font-semibold text-foreground">{t("title")}</Text>
        <LanguageSwitcher />
      </View>

      <Text className="text-muted-foreground" testID="notes-count">
        {t("count", { count: notes.length })}
      </Text>

      <View className="gap-1" testID="notes-list">
        {notes.map((note) => (
          <View key={note.id} className="rounded-md border border-border bg-card p-3">
            <Text className="text-foreground">{note.title}</Text>
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
      <TextInput
        accessibilityLabel={t("bodyLabel")}
        placeholder={t("bodyLabel")}
        className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
        value={body}
        onChangeText={setBody}
        multiline
      />
      <Button
        disabled={createNote.isPending}
        onPress={() => {
          createNote.mutate({ title, body });
        }}
      >
        {t("addButton")}
      </Button>

      <Link href="/files">
        <Text className="text-primary">{t("files:title")}</Text>
      </Link>
      <Link href="/tasks">
        <Text className="text-primary">{t("tasks:title")}</Text>
      </Link>
    </View>
  );
}
