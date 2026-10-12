import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

// @testing-library/react регистрирует автоочистку сам, но только если
// находит глобальный afterEach — у нас test.globals не включён (раздел
// "Фаза 6" задания: найдено на первом React-компоненте, который реально
// отрендерился в тесте, packages/ui-web/src/components/button.test.tsx —
// без этого второй и третий тест в файле видели кнопки предыдущих).
afterEach(cleanup);
