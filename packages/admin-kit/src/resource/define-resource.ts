import type { ColumnDef, RowData, StockFeatures } from "@tanstack/react-table";
import type { z } from "zod";

import type { FieldOverrideMap } from "../form/field-registry.js";

export interface ResourcePermissions {
  list?: string;
  create?: string;
  update?: string;
  remove?: string;
}

// defineResource — только метаданные, без транспорта (правило ui.md:
// компонент не знает про @boilerplate/contract/api-client напрямую).
// Вызывающий код (apps/web) достаёт схемы из packages/contract и вызовы
// из api-client сам — DataTable/ResourceForm получают их как пропсы.
export interface ResourceDefinition<TEntity extends RowData> {
  name: string;
  label: string;
  /** Колонки TanStack Table — те же, что приняла бы обычная таблица. */
  columns: ColumnDef<StockFeatures, TEntity>[];
  /** Схема создания — поля формы выводятся из неё (раздел "Фаза 8" задания, пункт 8.1). */
  createSchema?: z.ZodObject;
  /** Схема изменения — по умолчанию та же, что createSchema (частичная). */
  updateSchema?: z.ZodObject;
  /** Переопределения конкретных полей формы — не весь компонент переписывается. */
  formOverrides?: FieldOverrideMap;
  permissions?: ResourcePermissions;
}

export function defineResource<TEntity extends RowData>(
  config: ResourceDefinition<TEntity>,
): ResourceDefinition<TEntity> {
  return config;
}
