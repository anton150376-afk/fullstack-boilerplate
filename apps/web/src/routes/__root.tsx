import type { QueryClient } from "@tanstack/query-core";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";

import { createI18n } from "@boilerplate/i18n";

import { BugReportTrigger } from "../components/bug-report-trigger.js";
import { isBugReportsEnabled } from "../lib/is-bug-reports-enabled.js";
import { getLanguage } from "../lib/language.js";
import appCss from "../styles/app.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

// Двойной вызов — createRootRouteWithContext<Type>()({...}), не один
// (раздел "Фаза 6" задания, пункт 2): это фабрика, первый вызов передаёт
// тип контекста, второй — опции маршрута.
export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Boilerplate" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  // Язык — из cookie через серверную функцию (раздел "Фаза 6" задания,
  // пункт 7), не из сегмента пути: beforeLoad выполняется и на сервере,
  // и на клиенте при навигации, а getLanguage() сам решает, где читать
  // cookie (src/lib/language.ts).
  beforeLoad: async () => ({ language: await getLanguage() }),
  component: RootComponent,
});

function RootComponent() {
  const { language } = Route.useRouteContext();
  // Новый экземпляр i18next на каждое значение языка (не на каждый
  // рендер) — общий модульный синглтон на сервере означал бы утечку
  // выбора языка одного пользователя другому, тот же принцип, что у
  // QueryClient в src/router.tsx.
  const i18n = useMemo(() => createI18n({ language }), [language]);

  return (
    <I18nextProvider i18n={i18n}>
      <RootDocument language={language}>
        <AppNav />
        <Outlet />
        {isBugReportsEnabled(import.meta.env.VITE_ENABLE_BUG_REPORTS) && <BugReportTrigger />}
      </RootDocument>
    </I18nextProvider>
  );
}

// Отдельный компонент: useTranslation работает только ниже I18nextProvider,
// а RootComponent сам создаёт провайдер.
function AppNav() {
  const { t } = useTranslation();

  return (
    <nav className="flex gap-4 border-b border-border p-4">
      <Link to="/" className="text-primary hover:underline">
        {t("navNotes")}
      </Link>
      <Link to="/files" className="text-primary hover:underline">
        {t("navFiles")}
      </Link>
      <Link to="/admin" className="text-primary hover:underline">
        {t("navAdmin")}
      </Link>
    </nav>
  );
}

function RootDocument({ children, language }: Readonly<{ children: ReactNode; language: string }>) {
  return (
    <html lang={language}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
