// См. packages/ui-web/vitest-setup.d.ts — та же причина: "types" в
// tsconfig.json не резолвит сабпуть-экспорты, matchers jest-dom
// расширяют Assertion из "/vitest", не из корня пакета.
import "@testing-library/jest-dom/vitest";
