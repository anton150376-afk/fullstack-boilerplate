import type { ColumnDef, StockFeatures } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.js";

interface Row {
  id: string;
  title: string;
}

const columns: ColumnDef<StockFeatures, Row>[] = [{ accessorKey: "title", header: "Заголовок" }];

describe("DataTable", () => {
  it("рендерит строки и заголовок колонки", () => {
    render(
      <DataTable
        columns={columns}
        data={[{ id: "1", title: "Первая" }]}
        rowCount={1}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        sorting={[]}
        onSortingChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Заголовок")).toBeInTheDocument();
    expect(screen.getByText("Первая")).toBeInTheDocument();
  });

  it("показывает emptyLabel, когда данных нет", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowCount={0}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        sorting={[]}
        onSortingChange={vi.fn()}
        emptyLabel="Заметок пока нет"
      />,
    );

    expect(screen.getByText("Заметок пока нет")).toBeInTheDocument();
  });

  it("кнопка «Далее» отключена, когда страница последняя", () => {
    render(
      <DataTable
        columns={columns}
        data={[{ id: "1", title: "Первая" }]}
        rowCount={1}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        sorting={[]}
        onSortingChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Назад" })).toBeDisabled();
  });

  it("показывает «Не удалось загрузить данные» при isError", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowCount={0}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        sorting={[]}
        onSortingChange={vi.fn()}
        isError
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить данные");
  });
});
