import { execSync } from "node:child_process";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Версия и git SHA сборки — часть контекста багрепорта (раздел "Фаза 9"
// задания, пункт 9.1). VITE_GIT_SHA/VITE_BUILD_VERSION как настоящие
// переменные окружения (не просто define) — переопределимы в CI без
// .git или для детерминированных тестов; по умолчанию вычисляются сами.
function resolveGitSha(): string {
  if (process.env.VITE_GIT_SHA) {
    return process.env.VITE_GIT_SHA;
  }
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

function resolveBuildVersion(): string {
  return process.env.VITE_BUILD_VERSION ?? process.env.npm_package_version ?? "0.0.0";
}

// tanstackStart() обязательно раньше viteReact() (раздел "Фаза 6" задания,
// пункт 1) — иначе плагин React подменяет трансформацию JSX раньше, чем
// Start успевает расставить серверные границы.
//
// Vite пришпилен на 7.x (ADR-0001; docs/architecture/versions.md,
// docs/BACKLOG.md B-261008-vite8-tanstack-start) — на Vite 8 ломается
// SSR-мидлвар (TanStack/router#7614). @vitejs/plugin-react с версии 6.0.0
// требует Vite 8 как пир (проверено `npm view @vitejs/plugin-react@6.0.5
// peerDependencies`), поэтому здесь последний релиз ветки 5.x.
export default defineConfig({
  define: {
    "import.meta.env.VITE_GIT_SHA": JSON.stringify(resolveGitSha()),
    "import.meta.env.VITE_BUILD_VERSION": JSON.stringify(resolveBuildVersion()),
  },
  plugins: [
    // router.autoCodeSplitting — реальная сборка (`pnpm build`) требует
    // именно это имя и явно отвергает router.experimental.enableCodeSplitting
    // как устаревшее ("flag has been made stable"); установленные типы
    // schema.d.ts при этом ещё знают только старое имя — расхождение
    // между типами и рантаймом в этом слепке зависимостей, найдено
    // настоящей сборкой, не угадано. Каждый маршрут отдельным чанком —
    // раздел "Фаза 6" задания, пункт 9: /admin не раздувает основную сборку.
    tanstackStart({
      router: {
        autoCodeSplitting: true,
        // Тесты лежат рядом с маршрутом (src/routes/index.test.tsx) —
        // генератор маршрутов иначе пытается считать файл маршрутом,
        // раз он лежит в routesDirectory, и ругается, что в нём нет
        // экспорта Route.
        routeFileIgnorePattern: "\\.test\\.tsx$",
      },
    } as Parameters<typeof tanstackStart>[0]),
    tailwindcss(),
    viteReact(),
  ],
});
