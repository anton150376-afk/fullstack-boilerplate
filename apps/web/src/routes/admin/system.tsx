import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { SystemStatusPage } from "@boilerplate/admin-kit";
import { fetchHealthReady } from "@boilerplate/api-client";
import { adminLabels } from "@boilerplate/i18n";

// /health/ready — обычный REST поверх terminus, не oRPC-контракт (та же
// причина, что в docs/packages/contract.md: health не бизнес-операция).
// fetchHealthReady живёт в packages/api-client — прямые fetch() вне
// него запрещены линтером (раздел "Фаза 2" задания); admin-kit не
// делает запрос сам (правило ui.md) — результат передаётся пропсом.
export const Route = createFileRoute("/admin/system")({
  component: SystemPage,
});

function SystemPage() {
  const { t } = useTranslation("admin");
  const { data, isLoading } = useQuery({
    queryKey: ["health", "ready"],
    queryFn: () => fetchHealthReady(import.meta.env.VITE_API_URL),
  });

  return <SystemStatusPage health={data} isLoading={isLoading} labels={adminLabels(t).system} />;
}
