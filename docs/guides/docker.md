> **Зачем читать:** что в `docker-compose.yml`, как поднять окружение и забрать ключ Garage.
> **Кому:** кто поднимает окружение впервые или настраивает CI.
> **Последняя проверка:** 2026-10-12.

> Запуск проверен в настоящем Docker (GitHub Codespaces, Docker 29.8, Compose 5.5):
> `scripts/compose-check.sh` проходит целиком. На машине разработчика Docker нет
> (`docs/BACKLOG.md`, `B-261008-no-docker`) — раздел «Проверка контейнеров» ниже.

## Что в основном наборе

`docker-compose.yml` поднимает инфраструктуру без флагов — PostgreSQL,
Redis, Garage (S3-совместимое хранилище для разработки, не MinIO —
решение D16 задания, грабля 28: MinIO заархивирован). Приложения
(`server`+`worker` в профиле `app`, `web` в профиле `web`, веб-экспорт
`apps/mobile` в профиле `mobile-web`) не стартуют по умолчанию — каждое
приложение поднимается независимо от остальных, своим профилем:

```bash
pnpm docker:up              # только инфраструктура — для pnpm --filter server dev на хосте
pnpm docker:up:app           # инфраструктура + server + worker в контейнерах, со сборкой
pnpm docker:up:web           # + apps/web (контейнер web, порт WEB_PORT, по умолчанию 3001)
pnpm docker:up:mobile-web    # + веб-экспорт apps/mobile (контейнер mobile-web, порт MOBILE_WEB_PORT, по умолчанию 3002)
pnpm docker:down
```

`web` и `mobile-web` рассчитывают на уже поднятый `server` (свой
`depends_on`, без `condition: service_healthy` — у обоих нет собственной
проверки состояния на уровне compose, только `HEALTHCHECK` в самом
образе) и принимают адрес API build-аргументом (`VITE_API_URL`/
`EXPO_PUBLIC_API_URL`) — оба читают его на этапе сборки
(`import.meta.env`/Metro вшивает в бандл), а не в рантайме. Исключение —
`API_INTERNAL_URL` у `web`: серверный рендеринг читает его из окружения
контейнера (подробнее в [apps/web.md](../apps/web.md)).

## Ключ доступа Garage

Ключ задаётся в `.env`, забирать его из контейнера не нужно. `.env.example`
содержит значения `S3_ACCESS_KEY_ID` и `S3_SECRET_ACCESS_KEY` для
локальной разработки. Compose передаёт их Garage как `GARAGE_DEFAULT_ACCESS_KEY`
и `GARAGE_DEFAULT_SECRET_KEY`, а имя бакета берёт из `S3_BUCKET` (по
умолчанию `app-files`) как `GARAGE_DEFAULT_BUCKET`. При старте Garage сам
создаёт этот ключ и бакет, а `server` и `worker` читают те же значения из
`.env`. Если ключ не задан, `docker compose` останавливается с сообщением.

Формат ключа: идентификатор от 8 знаков из букв, цифр и `-_.`, секрет от
16 печатных ASCII-знаков. Если том `garage-data` уже содержит ключ с тем же
идентификатором и другим секретом, Garage не стартует. Тогда либо верните
прежний секрет, либо удалите том (`docker compose down -v`, данные
хранилища пропадут).

Порты Garage опубликованы только на `127.0.0.1`: ключ из `.env.example`
известен всем, кто читал репозиторий.

## Миграции перед первым запуском сервера

```bash
pnpm docker:up
pnpm --filter server db:migrate   # применяет миграции к postgres из docker-compose
pnpm --filter server dev          # сервер на хосте, база и Redis — в контейнерах
```

## Проверка контейнеров

Сборку образов проверяет `docker.yml`, а запуск целиком — `scripts/compose-check.sh`
(`pnpm compose:check`; в CI — задача `compose`). Скрипт берёт `.env` из `.env.example`,
если его нет, и по шагам проверяет:

1. инфраструктура поднимается и становится healthy (PostgreSQL, Redis, Garage);
2. Garage создал ключ доступа и бакет из `GARAGE_DEFAULT_*` (`garage key info`, `garage bucket info`);
3. миграции применяются с хоста;
4. `server`, `worker`, `web` и `mobile-web` собираются, стартуют и становятся healthy;
5. `/health/live` и `/health/ready` отвечают 200, проходит `scripts/smoke-api.sh`;
6. остановка Redis даёт `/health/ready` 503 при живом `/health/live`, после запуска Redis всё возвращается;
7. веб отдаёт HTML и скрипт клиента из `/assets/` (раньше все `/assets/*` были 404), `mobile-web` отвечает 200;
8. с `WITH_E2E=1` — браузерные тесты Playwright против контейнеров (кроме багрепорта: кнопка вшивается
   в бандл при сборке, а отчёты пишутся внутрь контейнера).

Результат 2026-10-12 (Codespace): все восемь шагов зелёные, 20 запросов дымовой проверки, 503 без Redis
и восстановление, пять браузерных тестов против контейнеров. Запуск впервые нашёл четыре дефекта:
том Postgres 18 монтировался в `/var/lib/postgresql/data` (образ 18+ требует `/var/lib/postgresql`),
пустые `BUG_REPORT_GITHUB_*` из `.env.example` роняли сервер при старте, `/app` в образе принадлежал root
(сервер не мог создать `.bugs/`), `grep` принимал HTML веба за двоичный файл.

Нужны Docker с compose v2, Node и pnpm. `KEEP_UP=1` не гасит стек после проверки. При сбое
скрипт печатает состояние и хвост журналов контейнеров. Перед запуском на своей машине освободите порты
3000, 3001, 3002, 5432, 6379 и 3900.

### Запуск в GitHub Codespaces

Бесплатная квота Codespaces отдельная от минут Actions, и там уже есть Docker. Подвох окружения, не
проекта: в Codespace рядом работают Docker с nftables и старый `iptables-legacy` с политикой
`FORWARD DROP`, поэтому контейнеры одной сети compose не видят друг друга (ping и TCP зависают,
в журналах `ETIMEDOUT` к Redis и Postgres). Лечится в самом Codespace командой
`sudo iptables-legacy -P FORWARD ACCEPT`; Codespace одноразовый. Порядок:

```bash
nvm install 22 && nvm use 22 && corepack enable
pnpm install --frozen-lockfile
pnpm --filter web e2e:install
sudo iptables-legacy -P FORWARD ACCEPT
WITH_E2E=1 bash scripts/compose-check.sh
```

## Образы и сборка

Все три Dockerfile — многоступенчатые, через `turbo prune <app>
--docker` (решение агента, ADR-0001, версия турбо пришпилена —
`npx turbo@2.11.7`, не просто `npx turbo`, чтобы обрезка не зависела от
того, что `npx` разрешит на момент сборки): обрезка монорепозитория до
нужного приложения и его реальных зависимостей, отдельный слой
зависимостей и слой исходников, непривилегированный пользователь.

- `apps/server/Dockerfile` — два целевых образа из одного Dockerfile,
  `api` и `worker` (общий собранный код). `api`'s `HEALTHCHECK` смотрит
  на `/health/live` (не `/health/ready` — короткий сбой базы не должен
  перезапускать контейнер). `worker` не поднимает HTTP (BullMQ-процесс
  без Nest-приложения) — его `HEALTHCHECK` читает `/proc/1/cmdline`
  (воркер — PID 1 в своём контейнере), без внешних утилит типа `pgrep`,
  которых на `-slim` по умолчанию нет.
- `apps/web/Dockerfile` — один образ (`web`), один процесс обслуживает и
  SSR (TanStack Start), и собранный клиентский бандл — не статический
  экспорт. `HEALTHCHECK` — обычный HTTP-запрос на корень.
- `apps/mobile/Dockerfile` — один образ (`mobile-web`), только
  веб-экспорт (`expo export -p web`), отданный плоским статическим
  сервером (`serve`) — не Metro и не полноценное RN-приложение в
  контейнере, раздел "Фаза 7" задания, пункт 8: веб-поверхность
  мобильного приложения вторичная. `serve` ставится при сборке образа с точной версией
  (`serve@14.2.6`), а не `npx` при запуске: контейнеру не нужна сеть.

## Переменные окружения контейнеров

`server`/`worker` получают `DATABASE_URL`/`REDIS_URL`/`S3_ENDPOINT`,
указывающие на соседние контейнеры по имени сервиса (`postgres`, `redis`,
`garage`), а не `localhost`. `S3_PUBLIC_ENDPOINT` указывает на `localhost`:
этот адрес попадает в подписанные URL, которые открывает браузер, а имя
сервиса compose с хоста не разрешается — остальные переменные (ключи Garage, уровень
логов) приходят из `.env` через `env_file`. Полный список — `docs/operations/env-vars.md`.

## Два разработчика на одной машине

`docker-compose.override.yml.example` → `docker-compose.override.yml`
(в `.gitignore`), свои порты или `COMPOSE_PROJECT_NAME` в `.env` — раздел
7.9 задания, подробнее в `CONTRIBUTING.md`.

## Частые ошибки

- Проверять `/health/ready` в `HEALTHCHECK` самого контейнера — временный
  сбой зависимости рестартует весь сервис вместо того, чтобы остаться
  видимым через `ready`.
- Написать `--default-bucket app-files`: у флага нет значения, лишний
  аргумент Garage отвергает. Имя бакета задаёт `GARAGE_DEFAULT_BUCKET`.
- Запустить Garage с `--default-bucket`, не задав `GARAGE_DEFAULT_*`:
  сервер завершается с ошибкой `Environment variable ... is not set`.
- Убрать `--default-bucket`: тогда бакет и ключ придётся создавать вручную
  (`garage bucket create`, `garage key create`, `garage bucket allow`).

## Ссылки

- [apps/server.md](../apps/server.md) — что сервер делает с этими переменными.
- [operations/env-vars.md](../operations/env-vars.md) — полный список переменных.
