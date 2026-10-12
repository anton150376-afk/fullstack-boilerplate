import vitestPlugin from "@vitest/eslint-plugin";

import base from "./base.js";

export default [
  ...base,
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.e2e-spec.ts"],
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      // Базовое правило не понимает моки vi.fn() и ложно считает каждое
      // обращение к замоканному методу в expect(...) "отвязанным методом".
      // vitest/unbound-method — тот же анализ с поправкой на моки.
      "@typescript-eslint/unbound-method": "off",
      "vitest/unbound-method": "error",
    },
  },
];
