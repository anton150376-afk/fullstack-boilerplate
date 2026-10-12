import { readFileSync } from "node:fs";
import { join } from "node:path";

// Регресс: без `import "../global.css"` в корневом экране классы Uniwind
// (className) не применяются, контейнер навигатора схлопывается до нулевой
// высоты, и приложение на телефоне показывает пустой экран. Jest этого не
// видит (в тестах стили не подключены), поэтому проверяем сам исходник
// корневого экрана. Нашёл запуск на настоящем телефоне.
describe("корневой экран (apps/mobile/src/app/_layout.tsx)", () => {
  const source = readFileSync(join(__dirname, "app", "_layout.tsx"), "utf8");

  it("подключает global.css", () => {
    expect(source).toMatch(/^import ["']\.\.\/global\.css["'];$/m);
  });

  it("global.css на самом деле существует и подключает Uniwind", () => {
    const css = readFileSync(join(__dirname, "global.css"), "utf8");

    expect(css).toContain('@import "uniwind"');
  });
});
