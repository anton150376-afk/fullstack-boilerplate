import { defineProject } from "vitest/config";

import { domPreset } from "@boilerplate/testing/presets/dom";

export default defineProject({
  test: {
    ...domPreset,
    name: "ui-web",
    include: ["src/**/*.test.tsx"],
  },
});
