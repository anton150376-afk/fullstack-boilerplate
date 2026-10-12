import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable, ResourceForm } from "@boilerplate/admin-kit";
import { createNoteInputSchema } from "@boilerplate/contract";
import { adminLabels } from "@boilerplate/i18n";

import { api } from "../../lib/api.js";

// Полный цикл показательной сущности (раздел "Фаза 8" задания, пункт
// 8.7): список через DataTable, создание через ResourceForm — обе
// читают/валидируют ту же схему контракта, что и сервер (раздел 8.3).
// contract.notes.list из Фазы 4 отдаёт список целиком, без пагинации —
// состояние таблицы здесь не читается из адресной строки (нечему):
// ресурс с настоящей постраничной выдачей читал бы validateSearch
// (раздел 8.2 задания), это — показательная сущность, не прецедент.
// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop(): void {}

export const Route = createFileRoute("/admin/notes")({
  // ensureQueryData устарел — queryClient.query(opts) тот же приём, что
  // apps/web/src/routes/index.tsx (Фаза 6): staleTime: "static" держит
  // данные из загрузчика без немедленного рефетча при гидратации.
  loader: ({ context }) =>
    context.queryClient.query({ ...api.notes.list.queryOptions(), staleTime: "static" }),
  component: AdminNotesPage,
});

function AdminNotesPage() {
  const { t } = useTranslation("notes");
  const { t: tAdmin } = useTranslation("admin");
  const { data: notes } = useSuspenseQuery(api.notes.list.queryOptions());
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const createNote = useMutation(
    api.notes.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: api.notes.list.queryKey() });
        setShowForm(false);
        setServerErrors({});
      },
      onError: (error) => {
        setServerErrors({ title: error.message });
      },
    }),
  );

  const removeNote = useMutation(
    api.notes.remove.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: api.notes.list.queryKey() });
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
          {showForm ? t("hideForm") : t("addButton")}
        </button>
      </div>

      {showForm && (
        <ResourceForm
          schema={createNoteInputSchema}
          overrides={{ title: { label: t("titleLabel") }, body: { label: t("bodyLabel") } }}
          submitLabel={adminLabels(tAdmin).form.submit}
          serverErrors={serverErrors}
          pending={createNote.isPending}
          onSubmit={(values) => {
            createNote.mutate(values);
          }}
        />
      )}

      <DataTable
        columns={[
          { accessorKey: "title", header: t("titleLabel") },
          { accessorKey: "body", header: t("bodyLabel") },
          {
            id: "actions",
            header: "",
            cell: (ctx) => (
              <button
                type="button"
                className="text-destructive"
                onClick={() => {
                  removeNote.mutate({ id: ctx.row.original.id });
                }}
              >
                {t("removeButton")}
              </button>
            ),
          },
        ]}
        data={notes}
        rowCount={notes.length}
        pagination={{ pageIndex: 0, pageSize: notes.length || 1 }}
        onPaginationChange={noop}
        sorting={[]}
        onSortingChange={noop}
        emptyLabel={t("emptyLabel")}
        labels={adminLabels(tAdmin).table}
      />
    </div>
  );
}
