import { useTranslation } from "react-i18next";

import { NotFoundPage } from "@boilerplate/admin-kit";
import { adminLabels } from "@boilerplate/i18n";

// Страница 404 читает подписи из каталога: router.tsx передаёт её как
// defaultNotFoundComponent, а он рендерится внутри I18nextProvider корня.
export function NotFound() {
  const { t } = useTranslation("admin");

  return <NotFoundPage labels={adminLabels(t).pages} />;
}
