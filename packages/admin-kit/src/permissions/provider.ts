// Интерфейс поставщика прав (раздел "Фаза 8" задания, пункт 8.4) —
// модуль прав приходит позже (M2). createAllowAllPermissions — заглушка
// для разработки; настоящая реализация подключается без правок экранов
// (AdminLayout/DataTable/ResourceForm держат только эту сигнатуру).
export interface PermissionsProvider {
  can: (permission: string | undefined) => boolean;
}

export function createAllowAllPermissions(): PermissionsProvider {
  return { can: () => true };
}

export function createDenyAllPermissions(): PermissionsProvider {
  return { can: () => false };
}

export function createAllowListPermissions(allowed: Set<string>): PermissionsProvider {
  return { can: (permission) => permission === undefined || allowed.has(permission) };
}
