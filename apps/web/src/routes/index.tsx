import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@boilerplate/ui-web";

import { LanguageSwitcher } from "../components/language-switcher.js";
import { api } from "../lib/api.js";

// queryClient.query(opts) в загрузчике — не queryClient.fetchQuery
// (устаревший, грабля 9 задания) — и useSuspenseQuery с тем же объектом
// опций в компоненте: один источник конфигурации запроса для SSR-загрузки
// и для клиентского кеша (раздел "Фаза 6" задания, пункт 3).
export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.query(api.notes.list.queryOptions()),
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation("notes");
  const { queryClient } = Route.useRouteContext();
  const { data: notes } = useSuspenseQuery(api.notes.list.queryOptions());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const createNote = useMutation(
    api.notes.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: api.notes.list.queryKey() });
        setTitle("");
        setBody("");
      },
    }),
  );

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <LanguageSwitcher />
      </div>

      <p className="text-muted-foreground" data-testid="notes-count">
        {t("count", { count: notes.length })}
      </p>

      <ul className="space-y-1" data-testid="notes-list">
        {notes.map((note) => (
          <li key={note.id} className="rounded-md border border-border bg-card p-3">
            {note.title}
          </li>
        ))}
      </ul>

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          createNote.mutate({ title, body });
        }}
      >
        <input
          aria-label={t("titleLabel")}
          placeholder={t("titleLabel")}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
        <textarea
          aria-label={t("bodyLabel")}
          placeholder={t("bodyLabel")}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
          }}
        />
        <Button type="submit" disabled={createNote.isPending}>
          {t("addButton")}
        </Button>
      </form>
    </main>
  );
}
