> **Зачем читать:** первая настройка окружения с нуля, по шагам.
> **Кому:** кто впервые клонирует этот репозиторий.
> **Последняя проверка:** 2026-10-08.

## Шаги

1. `git clone` и `cd` в репозиторий.
2. `corepack enable` — версия pnpm зафиксирована в `package.json`
   (`packageManager`), corepack поставит именно её.
3. `pnpm install`.
4. Скопировать `.env.example` в `.env` (корень) и в `apps/server/.env` —
   `apps/server` читает свой собственный `.env` (Prisma и `@nestjs/config`
   ищут его в cwd пакета, не в корне монорепозитория). Секреты (токены,
   ключи внешних сервисов) — из менеджера паролей, не из переписки
   (`docs/operations/env-vars.md`). Ключ локального Garage уже есть в
   `.env.example`.
5. Поднять инфраструктуру: `pnpm docker:up` (PostgreSQL, Redis, Garage —
   про ключ доступа — `docs/guides/docker.md`).
6. `pnpm --filter server db:migrate` — применяет миграции к базе из
   контейнера.
7. `pnpm dev` — поднимает все приложения разом через Turborepo, либо
   `pnpm --filter <app> dev` для одного конкретного.
8. Перед первым коммитом — `pnpm gate` (тот же скрипт, что хук `Stop` у
   агента и задача `gate` в CI, `docs/operations/ci.md`).

## Частые ошибки

- Забыть `apps/server/.env` — `prisma generate`/`pnpm build` падают на
  шаге `db:generate` без `DATABASE_URL`, даже если корневой `.env`
  заполнен (`docs/BACKLOG.md`, `B-261008-local-env-for-prisma`).
- Запускать `npm`/`yarn` вместо `pnpm` — монорепозиторий держится на
  рабочих пространствах и каталоге версий (`catalog:`) pnpm, другие
  менеджеры их не понимают.
- Пропустить `pnpm docker:up` перед `db:migrate` — без поднятой
  инфраструктуры миграция просто не находит `DATABASE_URL`.

## Ссылки

- [guides/docker.md](docker.md) — инфраструктура, ключ Garage, профили.
- [operations/env-vars.md](../operations/env-vars.md) — полный список переменных.
- [operations/ci.md](../operations/ci.md) — что проверяет `pnpm gate` и CI.
- `CONTRIBUTING.md` — правила совместной работы (миграции, lock-файл, каталоги i18n).
