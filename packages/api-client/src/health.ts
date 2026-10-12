export interface HealthCheckResult {
  status: "ok" | "error" | "shutting_down";
  details: Record<string, { status: "up" | "down"; [key: string]: unknown }>;
}

// /health/ready — обычный REST поверх terminus, не oRPC-контракт (см.
// docs/packages/contract.md). Прямые fetch() вне packages/api-client
// запрещены линтером react.js (раздел "Фаза 2" задания) — для
// apps/web/src/routes/admin/system.tsx (Фаза 8) нужен такой же тонкий
// вызов, как у остального транспорта, не отдельное исключение в правилах.
export async function fetchHealthReady(baseUrl: string): Promise<HealthCheckResult> {
  const response = await fetch(`${baseUrl}/health/ready`);
  return (await response.json()) as HealthCheckResult;
}
