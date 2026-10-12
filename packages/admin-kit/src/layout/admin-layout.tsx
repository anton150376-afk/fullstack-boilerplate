import type { ComponentType, ReactNode } from "react";

import { defaultAdminLayoutLabels, resolveLabels, type AdminLayoutLabels } from "../labels.js";
import type { PermissionsProvider } from "../permissions/provider.js";
import type { ResourceDefinition } from "../resource/define-resource.js";

export interface AdminNavLinkProps {
  to: string;
  className?: string;
  children: ReactNode;
}

export interface AdminLayoutProps {
  // AdminLayout показывает только name/label/permissions ресурса — тип
  // сущности не важен здесь, ResourceDefinition требует его структурно (RowData).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resources: ResourceDefinition<any>[];
  permissions: PermissionsProvider;
  /** apps/web передаёт @tanstack/react-router Link — admin-kit не знает про роутер (правило ui.md). */
  linkComponent: ComponentType<AdminNavLinkProps>;
  children: ReactNode;
  /** Подписи; незаданные остаются русскими. */
  labels?: Partial<AdminLayoutLabels>;
}

// Гейтинг на трёх уровнях (раздел "Фаза 8" задания, пункт 8.4): здесь —
// пункт навигации скрыт. Маршрут закрыт и действие недоступно — на
// стороне вызывающего кода (apps/web проверяет те же permissions.can()
// в beforeLoad маршрута и в DataTable/ResourceForm перед действием).
export function AdminLayout({
  resources,
  permissions,
  linkComponent: Link,
  children,
  labels,
}: AdminLayoutProps) {
  const text = resolveLabels(defaultAdminLayoutLabels, labels);
  const visibleResources = resources.filter((resource) =>
    permissions.can(resource.permissions?.list),
  );

  return (
    <div className="flex min-h-screen">
      <nav className="w-56 border-r border-border p-4" aria-label={text.navigation}>
        <ul className="flex flex-col gap-1">
          {visibleResources.map((resource) => (
            <li key={resource.name}>
              <Link to={`/admin/${resource.name}`} className="text-primary">
                {resource.label}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/admin/system" className="text-primary">
              {text.systemStatus}
            </Link>
          </li>
        </ul>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
