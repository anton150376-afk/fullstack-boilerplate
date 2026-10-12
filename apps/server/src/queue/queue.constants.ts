export const NOTIFICATIONS_QUEUE = "notifications";
export const MAINTENANCE_QUEUE = "maintenance";

export const CLEANUP_PENDING_UPLOADS_JOB = "cleanup-pending-uploads";
export const CLEANUP_SCHEDULER_ID = "cleanup-pending-uploads-scheduler";
// Записи в ожидании старше этого возраста считаются брошенными клиентом —
// талон на загрузку выдан, но подтверждения не последовало.
export const PENDING_UPLOAD_MAX_AGE_MS = 24 * 60 * 60 * 1000;
