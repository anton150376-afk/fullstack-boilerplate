import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";

import { Button } from "@boilerplate/ui-web";

import { setLanguage } from "../lib/language.js";

// useServerFn, не прямой вызов setLanguage() (раздел "Фаза 6" задания,
// пункт 7, по образцу react-start/SKILL.md): так клиент вызывает
// серверную функцию через правильный транспорт Start.
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const setLanguageFn = useServerFn(setLanguage);

  async function switchTo(language: string): Promise<void> {
    if (language === i18n.language) {
      return;
    }
    await setLanguageFn({ data: language });
    // beforeLoad корня читает cookie заново (src/routes/__root.tsx) —
    // invalidate перечитывает её, не полная перезагрузка страницы.
    await router.invalidate();
  }

  return (
    <div role="group" aria-label={t("language")}>
      <Button
        variant={i18n.language === "ru" ? "primary" : "outline"}
        size="sm"
        onClick={() => void switchTo("ru")}
      >
        {/* i18n-ignore: название языка записано на нём самом */}
        Рус
      </Button>
      <Button
        variant={i18n.language === "en" ? "primary" : "outline"}
        size="sm"
        onClick={() => void switchTo("en")}
      >
        Eng
      </Button>
    </div>
  );
}
