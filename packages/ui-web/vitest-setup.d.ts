// "types" в tsconfig.json не умеет резолвить сабпуть-экспорты (только
// основной пакет) — matchers jest-dom (toHaveTextContent и так далее)
// расширяют Assertion из "@testing-library/jest-dom/vitest", а не из
// корня пакета. Рантайм-подключение — в @boilerplate/testing/setup/dom
// (packages/testing/src/setup/dom.ts); этот файл только для типов.
import "@testing-library/jest-dom/vitest";
