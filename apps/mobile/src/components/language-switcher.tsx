import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Button } from "@boilerplate/ui-native";

import { saveLanguage } from "../lib/language.js";

// Аналог apps/web/src/components/language-switcher.tsx — здесь нет
// cookie/router.invalidate(), i18n.changeLanguage() сам перерисовывает
// подписанные компоненты; сохранённый выбор переживает перезапуск
// приложения через src/lib/language.ts.
export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  async function switchTo(language: "ru" | "en"): Promise<void> {
    if (language === i18n.language) {
      return;
    }
    await i18n.changeLanguage(language);
    await saveLanguage(language);
  }

  return (
    <View className="flex flex-row gap-2" accessibilityRole="none">
      <Button
        variant={i18n.language === "ru" ? "primary" : "outline"}
        size="sm"
        onPress={() => void switchTo("ru")}
      >
        {/* i18n-ignore: название языка записано на нём самом */}
        Рус
      </Button>
      <Button
        variant={i18n.language === "en" ? "primary" : "outline"}
        size="sm"
        onPress={() => void switchTo("en")}
      >
        Eng
      </Button>
    </View>
  );
}
