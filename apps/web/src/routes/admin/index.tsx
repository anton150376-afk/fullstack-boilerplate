import { createFileRoute, redirect } from "@tanstack/react-router";

// Пустой индекс /admin сразу ведёт на первый ресурс реестра — страница
// без контента никому не нужна (раздел "Фаза 8" задания, пункт 8.7).
export const Route = createFileRoute("/admin/")({
  loader: () => {
    // redirect() — управляющий сигнал роутера, не Error (стандартный
    // приём @tanstack/react-router, не наша находка).
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: "/admin/notes" });
  },
});
