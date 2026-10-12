import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  createAllowAllPermissions,
  createAllowListPermissions,
  createDenyAllPermissions,
} from "../permissions/provider.js";
import { defineResource } from "../resource/define-resource.js";
import { AdminLayout, type AdminNavLinkProps } from "./admin-layout.js";

function FakeLink({ to, className, children }: AdminNavLinkProps) {
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}

const noteResource = defineResource<{ id: string }>({
  name: "note",
  label: "Заметки",
  columns: [],
  permissions: { list: "note:read" },
});

// Критерий приёмки Фазы 8: заглушка поставщика прав заменяется на
// другую реализацию без правок экранов — AdminLayout не меняется между
// тестами, меняется только переданный permissions.
describe("AdminLayout — смена поставщика прав без правок экрана", () => {
  it("с allowAll пункт ресурса виден", () => {
    render(
      <AdminLayout
        resources={[noteResource]}
        permissions={createAllowAllPermissions()}
        linkComponent={FakeLink}
      >
        <div />
      </AdminLayout>,
    );

    expect(screen.getByRole("link", { name: "Заметки" })).toBeInTheDocument();
  });

  it("с denyAll пункт ресурса скрыт", () => {
    render(
      <AdminLayout
        resources={[noteResource]}
        permissions={createDenyAllPermissions()}
        linkComponent={FakeLink}
      >
        <div />
      </AdminLayout>,
    );

    expect(screen.queryByRole("link", { name: "Заметки" })).not.toBeInTheDocument();
  });

  it("с allowList, не содержащим note:read, пункт тоже скрыт", () => {
    render(
      <AdminLayout
        resources={[noteResource]}
        permissions={createAllowListPermissions(new Set(["file:read"]))}
        linkComponent={FakeLink}
      >
        <div />
      </AdminLayout>,
    );

    expect(screen.queryByRole("link", { name: "Заметки" })).not.toBeInTheDocument();
  });
});
