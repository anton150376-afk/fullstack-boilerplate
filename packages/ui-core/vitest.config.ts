import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "ui-core",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
