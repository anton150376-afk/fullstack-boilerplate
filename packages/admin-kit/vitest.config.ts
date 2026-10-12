import { defineProject } from "vitest/config";

import { domPreset } from "@boilerplate/testing/presets/dom";

export default defineProject({
  test: {
    ...domPreset,
    name: "admin-kit",
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
  },
});
