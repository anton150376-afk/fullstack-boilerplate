import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "tailwind-config",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
