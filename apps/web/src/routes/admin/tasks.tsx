import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable, ResourceForm } from "@boilerplate/admin-kit";
import { createTaskInputSchema } from "@boilerplate/contract";
import { adminLabels } from "@boilerplate/i18n";

import { api } from "../../lib/api.js";

// Фаза 12.3 задания — сквозная проверка шаблона на новой сущности (не
// "Заметки"): тот же приём, что apps/web/src/routes/admin/notes.tsx
// (список через DataTable, создание через ResourceForm), но с настоящим
// i18n (notes.tsx держал строки буквально — здесь через useTranslation,
// чтобы проверить и эту часть шаблона на новой сущности).
// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop(): void {}

export const Route = createFileRoute("/admin/tasks")({
  loader: ({ context }) =>
    context.queryClient.query({ ...api.tasks.list.queryOptions(), staleTime: "static" }),
  component: AdminTasksPage,
});

function AdminTasksPage() {
  const { t } = useTranslation("tasks");
  const { t: tAdmin } = useTranslation("admin");
  const { data: tasks } = useSuspenseQuery(api.tasks.list.queryOptions());
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: api.tasks.list.queryKey() });

  const createTask = useMutation(
    api.tasks.create.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setShowForm(false);
        setServerErrors({});
      },
      onError: (error) => {
        setServerErrors({ title: error.message });
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => {
            setShowForm((prev) => !prev);
          }}
        >
          {t("addButton")}
        </button>
      </div>

      {showForm && (
        <ResourceForm
          schema={createTaskInputSchema}
          overrides={{ title: { label: t("titleLabel") } }}
          submitLabel={adminLabels(tAdmin).form.submit}
          serverErrors={serverErrors}
          pending={createTask.isPending}
          onSubmit={(values) => {
            createTask.mutate(values);
          }}
        />
      )}

      <DataTable
        columns={[
          { accessorKey: "title", header: t("titleLabel") },
          {
            id: "done",
            header: t("doneLabel"),
            cell: (ctx) => (
              <input
                type="checkbox"
                checked={ctx.row.original.done}
                onChange={() => {
                  toggleTask.mutate({ id: ctx.row.original.id });
                }}
              />
            ),
          },
          {
            id: "actions",
            header: "",
            cell: (ctx) => (
              <button
                type="button"
                className="text-destructive"
                onClick={() => {
                  removeTask.mutate({ id: ctx.row.original.id });
                }}
              >
                {t("removeButton")}
              </button>
            ),
          },
        ]}
        data={tasks}
        rowCount={tasks.length}
        pagination={{ pageIndex: 0, pageSize: tasks.length || 1 }}
        onPaginationChange={noop}
        sorting={[]}
        onSortingChange={noop}
        emptyLabel={t("emptyLabel")}
        labels={adminLabels(tAdmin).table}
      />
    </div>
  );
}
