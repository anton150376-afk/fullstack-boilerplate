import {
  stockFeatures,
  useTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type SortingState,
  type StockFeatures,
} from "@tanstack/react-table";

import { Button } from "@boilerplate/ui-web";

import { defaultDataTableLabels, resolveLabels, type DataTableLabels } from "../labels.js";

// TFeatures — первый параметр ColumnDef в v9 (не TData, как в v8) —
// stockFeatures как значение, StockFeatures как тип (раздел "Фаза 8"
// задания, пункт 8.2: useTable — новый API, не useReactTable).
export interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<StockFeatures, TData>[];
  data: TData[];
  rowCount: number;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  isLoading?: boolean;
  isError?: boolean;
  emptyLabel?: string;
  /** Подписи; незаданные остаются русскими. `emptyLabel` имеет приоритет над `labels.empty`. */
  labels?: Partial<DataTableLabels>;
}

// Таблица ничего не вычисляет сама (раздел "Фаза 8" задания, пункт 8.2):
// manualPagination/manualSorting — общее число строк и порядок приходят
// готовыми, с сервера, через contract. useTable — новый API v9
// (useReactTable переименован), не useLegacyTable: stockFeatures даёт
// то же поведение "всё включено", оставаясь на текущем API библиотеки.
export function DataTable<TData extends RowData>({
  columns,
  data,
  rowCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  isLoading = false,
  isError = false,
  emptyLabel,
  labels,
}: DataTableProps<TData>) {
  const text = resolveLabels(defaultDataTableLabels, labels);
  const table = useTable({
    features: stockFeatures,
    columns,
    data,
    rowCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: { pagination, sorting },
    onPaginationChange,
    onSortingChange,
    getRowId: (_row, index) => String(index),
  });

  if (isError) {
    return (
      <p role="alert" className="text-destructive">
        {text.loadFailed}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full border-collapse text-left">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="p-2 text-sm font-medium text-muted-foreground">
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className="flex items-center gap-1"
                      disabled={!header.column.getCanSort()}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <table.FlexRender header={header} />
                      {{ asc: "↑", desc: "↓" }[header.column.getIsSorted() as string] ?? null}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="p-4 text-center text-muted-foreground">
                {text.loading}
              </td>
            </tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-4 text-center text-muted-foreground">
                {emptyLabel ?? text.empty}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-border">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-2 text-foreground">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {text.page(pagination.pageIndex + 1, Math.max(table.getPageCount(), 1), rowCount)}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={table.previousPage}
          >
            {text.previous}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={table.nextPage}
          >
            {text.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
