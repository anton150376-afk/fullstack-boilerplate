import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { AdminLayout, createAllowAllPermissions, defineResource } from "@boilerplate/admin-kit";
import { adminLabels } from "@boilerplate/i18n";

// Макет для всей ветки /admin (раздел "Фаза 8" задания, пункт 8.4) —
// реестр ресурсов пока из одной показательной сущности Фазы 4 (notes).
// Поставщик прав — заглушка "разрешить всё" (M2, ROADMAP, пункт 8.4):
// настоящий поставщик подключается без правок этого файла и экранов
// (проверено тестом с двумя поставщиками в packages/admin-kit).
export const Route = createFileRoute("/admin")({
  component: AdminRootLayout,
});

function AdminRootLayout() {
  const { t } = useTranslation("admin");
  const { t: tNotes } = useTranslation("notes");
  const { t: tTasks } = useTranslation("tasks");
  const notesTitle = tNotes("title");
  const tasksTitle = tTasks("title");
  const resources = useMemo(
    () => [
      defineResource<{ id: string }>({
        name: "notes",
        label: notesTitle,
        columns: [],
        permissions: { list: "note:read" },
      }),
      defineResource<{ id: string }>({
        name: "tasks",
        label: tasksTitle,
        columns: [],
        permissions: { list: "task:read" },
      }),
    ],
    [notesTitle, tasksTitle],
  );

  return (
    <AdminLayout
      resources={resources}
      permissions={createAllowAllPermissions()}
      linkComponent={Link}
      labels={adminLabels(t).layout}
    >
      <Outlet />
    </AdminLayout>
  );
}
