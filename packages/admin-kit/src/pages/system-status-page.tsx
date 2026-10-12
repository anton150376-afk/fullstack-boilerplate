import { defaultSystemStatusLabels, resolveLabels, type SystemStatusLabels } from "../labels.js";

export interface HealthCheckResult {
  status: "ok" | "error" | "shutting_down";
  details: Record<string, { status: "up" | "down"; [key: string]: unknown }>;
}

export interface SystemStatusPageProps {
  health?: HealthCheckResult;
  isLoading?: boolean;
  buildVersion?: string;
  /** Подписи; незаданные остаются русскими. */
  labels?: Partial<SystemStatusLabels>;
}

// Сводка по /health/ready — терминус-формат (status/details), не свой
// (раздел "Фаза 8" задания, пункт 8.5). apps/web передаёт результат
// обычного запроса, admin-kit не делает его сам (правило ui.md).
export function SystemStatusPage({
  health,
  isLoading = false,
  buildVersion,
  labels,
}: SystemStatusPageProps) {
  const text = resolveLabels(defaultSystemStatusLabels, labels);
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">{text.title}</h1>
      {buildVersion && <p className="text-muted-foreground">{text.buildVersion(buildVersion)}</p>}
      {isLoading ? (
        <p className="text-muted-foreground">{text.loading}</p>
      ) : health ? (
        <ul className="flex flex-col gap-1" data-testid="health-details">
          {Object.entries(health.details).map(([name, detail]) => (
            <li key={name} className="flex items-center gap-2">
              <span
                className={detail.status === "up" ? "text-success-fg" : "text-danger-fg"}
                aria-hidden
              >
                ●
              </span>
              <span className="text-foreground">
                {name}: {detail.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p role="alert" className="text-destructive">
          {text.loadFailed}
        </p>
      )}
    </div>
  );
}
