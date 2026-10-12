import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { Suspense, useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { ActivityIndicator, View } from "react-native";

import { createI18n, defaultLanguage, type supportedLanguages } from "@boilerplate/i18n";

import { BugReportTrigger } from "../components/bug-report-trigger.js";
import { isBugReportsEnabled } from "../lib/is-bug-reports-enabled.js";
import { getInitialLanguage } from "../lib/language.js";
import { createMobileQueryClient } from "../lib/query-client.js";

// У Expo Router нет аналога beforeLoad из apps/web (раздел "Фаза 7"
// задания: "общий слой — это контракт, клиент и хуки", не загрузчики
// маршрутов) — язык читаем один раз в эффекте, не блокируя первый кадр
// заглушкой дольше необходимого.
export default function RootLayout() {
  const [queryClient] = useState(() => createMobileQueryClient());
  const [language, setLanguage] = useState<(typeof supportedLanguages)[number]>(defaultLanguage);

  useEffect(() => {
    void getInitialLanguage().then(setLanguage);
  }, []);

  const i18n = useMemo(() => createI18n({ language }), [language]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <View className="flex-1">
          <Suspense
            fallback={
              <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator />
              </View>
            }
          >
            <Stack />
          </Suspense>
          {isBugReportsEnabled(process.env.EXPO_PUBLIC_ENABLE_BUG_REPORTS) && <BugReportTrigger />}
        </View>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
