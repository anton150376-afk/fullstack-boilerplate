import type { ColumnDef, OnChangeFn, PaginationState, StockFeatures } from "@tanstack/react-table";
import { useMemo } from "react";

import {
  defaultAuditLogLabels,
  resolveLabels,
  type AuditLogLabels,
  type DataTableLabels,
} from "../labels.js";
import { DataTable } from "../table/data-table.js";

export interface AuditLogEntry {
  id: string;
  actor: string;
  entity: string;
  entityId: string;
  action: string;
  occurredAt: string | Date;
}

// Журнал не сортируется из интерфейса (сервер уже отдаёт occurredAt
// desc) — DataTable всё равно требует onSortingChange.
// eslint-disable-next-line @typescript-eslint/no-empty-function
function noopSortingChange(): void {}

export interface AuditLogTableProps {
  data: AuditLogEntry[];
  rowCount: number;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  isLoading?: boolean;
  /** Подписи колонок и пустого журнала; незаданные остаются русскими. */
  labels?: Partial<AuditLogLabels>;
  /** Подписи самой таблицы (пагинация, загрузка, ошибка). */
  tableLabels?: Partial<DataTableLabels>;
}

// Просмотр журнала входит в конструктор сразу (раздел "Фаза 8" задания,
// пункт 8.6) — без сортировки по умолчанию (сервер уже отдаёт по
// occurredAt desc), DataTable тот же компонент, что у обычных ресурсов.
export function AuditLogTable({
  data,
  rowCount,
  pagination,
  onPaginationChange,
  isLoading,
  labels,
  tableLabels,
}: AuditLogTableProps) {
  const text = resolveLabels(defaultAuditLogLabels, labels);
  const columns = useMemo<ColumnDef<StockFeatures, AuditLogEntry>[]>(
    () => [
      {
        accessorKey: "occurredAt",
        header: text.when,
        cell: (ctx) => new Date(ctx.getValue() as string).toLocaleString(text.locale),
      },
      { accessorKey: "actor", header: text.actor },
      { accessorKey: "entity", header: text.entity },
      { accessorKey: "entityId", header: text.id },
      { accessorKey: "action", header: text.action },
    ],
    [text.when, text.actor, text.entity, text.id, text.action, text.locale],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      rowCount={rowCount}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      sorting={[]}
      onSortingChange={noopSortingChange}
      isLoading={isLoading}
      emptyLabel={text.empty}
      labels={tableLabels}
    />
  );
}
