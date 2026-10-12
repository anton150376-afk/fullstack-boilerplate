# Boilerplate

Монорепозиторий-основа для нового проекта: общий контракт API (oRPC +
Zod), общая фабрика запросов (TanStack Query), общая палитра и парные
компоненты для веба и мобильного, конструктор админки, локализация на
два языка, багрепорт при разработке, CI и сайт документации.

## Из чего состоит

- **`apps/server`** — Nest 12, PostgreSQL (Prisma 7), очереди Redis (BullMQ).
- **`apps/web`** — TanStack Start/Router/Query, компоненты на Base UI (shadcn).
- **`apps/mobile`** — Expo SDK 57 + Expo Router, Uniwind (Tailwind для React Native).
- **`apps/docs`** — сайт документации (VitePress), страницы порождаются из репозитория.
- **`packages/contract`** — единственный источник правды по API: схема, типы, OpenAPI.
- **`packages/admin-kit`** — конструктор админ-панели: реестр ресурсов, таблица, форма, права.
- **`packages/devtools`** — плавающая кнопка «сообщить о проблеме», маскирование секретов.
- Общие пакеты: `ui-core`/`ui-web`/`ui-native`, `tailwind-config`, `i18n`, `storage`, `testing`.

Полная карта — [docs/architecture/overview.md](docs/architecture/overview.md).

## Запустить за пять минут

```bash
corepack enable
pnpm install
cp .env.example .env && cp .env.example apps/server/.env
pnpm docker:up                      # PostgreSQL, Redis, S3-совместимое хранилище
pnpm --filter server db:migrate
pnpm dev
```

Подробности, включая первый запуск ключа доступа к хранилищу —
[docs/guides/onboarding.md](docs/guides/onboarding.md).

## Перед тем как коммитить

```bash
pnpm gate
```

Та же команда — хук `Stop` у агента и обязательная проверка в CI
([docs/operations/ci.md](docs/operations/ci.md)).

## Начать новый проект из этой основы

```bash
pnpm tsx scripts/init-project.ts --name "Моё приложение"
```

Переименовывает scope пакетов, обнуляет бэклог и историю git,
убирает демонстрационную сущность. Что убрать дальше (мобильное,
админку, второй язык, файлы, очереди) — [docs/guides/trimming.md](docs/guides/trimming.md).

## Куда идти дальше

- [docs/README.md](docs/README.md) — карта всей документации.
- [docs/architecture/overview.md](docs/architecture/overview.md) — устройство решения, одной схемой.
- [ROADMAP.md](ROADMAP.md) — какие модули подключаются дальше (аутентификация, права, биллинг, уведомления) и по какой процедуре.
- [docs/BACKLOG.md](docs/BACKLOG.md) — открытые риски и остаток работ.

## Лицензия

MIT — [LICENSE](LICENSE).
