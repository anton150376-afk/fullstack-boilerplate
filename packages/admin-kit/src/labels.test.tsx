import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuditLogTable } from "./audit/audit-log-table.js";
import { AdminLayout } from "./layout/admin-layout.js";
import { ForbiddenPage, LoginPage, NotFoundPage } from "./pages/service-pages.js";
import { SystemStatusPage } from "./pages/system-status-page.js";
import { createAllowAllPermissions } from "./permissions/provider.js";
import { DataTable } from "./table/data-table.js";

// Подписи приходят пропсом labels (пакет не знает про react-i18next).
// Каждый компонент: переданный ключ заменяет русское значение,
// незаданный остаётся русским.
describe("labels компонентов admin-kit", () => {
  it("DataTable: пагинация и кнопки читают labels, пустое состояние — emptyLabel", () => {
    render(
      <DataTable
        columns={[{ accessorKey: "name", header: "Name" }]}
        data={[]}
        rowCount={0}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        sorting={[]}
        onSortingChange={vi.fn()}
        emptyLabel="Nothing here"
        labels={{
          previous: "Back",
          page: (page, pageCount, rowCount) => `Page ${page} of ${pageCount}, total ${rowCount}`,
        }}
      />,
    );

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Далее" })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1, total 0")).toBeInTheDocument();
  });

  it("DataTable: без labels пагинация остаётся русской", () => {
    render(
      <DataTable
        columns={[{ accessorKey: "name", header: "Name" }]}
        data={[]}
        rowCount={0}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        sorting={[]}
        onSortingChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Нет данных")).toBeInTheDocument();
    expect(screen.getByText("Страница 1 из 1 — всего 0")).toBeInTheDocument();
  });

  it("ForbiddenPage, NotFoundPage и LoginPage читают labels", () => {
    render(
      <>
        <ForbiddenPage labels={{ forbiddenTitle: "403 — Forbidden" }} />
        <NotFoundPage labels={{ notFoundTitle: "404 — Not found" }} />
        <LoginPage onSubmit={vi.fn()} labels={{ loginTitle: "Sign in", login: "Log in" }} />
      </>,
    );

    expect(screen.getByText("403 — Forbidden")).toBeInTheDocument();
    expect(screen.getByText("404 — Not found")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
  });

  it("SystemStatusPage: заголовок и версия сборки берутся из labels", () => {
    render(
      <SystemStatusPage
        buildVersion="1.2.3"
        isLoading
        labels={{ title: "System status", buildVersion: (version) => `Build: ${version}` }}
      />,
    );

    expect(screen.getByText("System status")).toBeInTheDocument();
    expect(screen.getByText("Build: 1.2.3")).toBeInTheDocument();
    expect(screen.getByText("Загрузка…")).toBeInTheDocument();
  });

  it("AdminLayout: имя навигации и пункт состояния системы читают labels", () => {
    render(
      <AdminLayout
        resources={[]}
        permissions={createAllowAllPermissions()}
        linkComponent={({ to, className, children }) => (
          <a href={to} className={className}>
            {children}
          </a>
        )}
        labels={{ navigation: "Admin", systemStatus: "System status" }}
      >
        <p>content</p>
      </AdminLayout>,
    );

    expect(screen.getByRole("navigation", { name: "Admin" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "System status" })).toBeInTheDocument();
  });

  it("AuditLogTable: заголовки колонок и пустой журнал читают labels, дата — locale", () => {
    render(
      <AuditLogTable
        data={[]}
        rowCount={0}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        labels={{ when: "When", empty: "Log is empty", locale: "en-US" }}
        tableLabels={{ next: "Next" }}
      />,
    );

    expect(screen.getByRole("button", { name: "When" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Кто" })).toBeInTheDocument();
    expect(screen.getByText("Log is empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });
});
