import { describe, expect, it } from "vitest";

import { defineFactory } from "./index.js";

interface User {
  id: string;
  email: string;
  isActive: boolean;
}

const userFactory = defineFactory<User>((sequence) => ({
  id: `user-${sequence}`,
  email: `user-${sequence}@example.com`,
  isActive: true,
}));

describe("defineFactory", () => {
  it("строит объект по умолчанию с нарастающим порядковым номером", () => {
    const first = userFactory.build();
    const second = userFactory.build();

    expect(first.id).not.toBe(second.id);
    expect(first.isActive).toBe(true);
  });

  it("применяет overrides поверх значений по умолчанию", () => {
    const user = userFactory.build({ isActive: false });

    expect(user.isActive).toBe(false);
    expect(user.email).toContain("@example.com");
  });

  it("buildList строит нужное количество различимых объектов", () => {
    const users = userFactory.buildList(3);

    expect(users).toHaveLength(3);
    expect(new Set(users.map((u) => u.id)).size).toBe(3);
  });
});
