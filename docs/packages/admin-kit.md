> **Зачем читать:** как устроен конструктор административных экранов —
> что генерируется из Zod-схемы автоматически и где граница, после
> которой нужны `overrides` или ручная форма.
> **Кому:** кто добавляет ресурс в `/admin` или меняет форму/таблицу.
> **Последняя проверка:** 2026-10-11.

## Что это

Переносимый конструктор (раздел "Фаза 8" задания) — список, создание,
изменение, удаление для любого ресурса, описанного Zod-схемой. Пакет
не знает про `@boilerplate/contract`/`api-client` напрямую (правило
`ui.md`): схемы и вызовы передаёт вызывающий код (`apps/web`), сам
пакет работает только с `zod`/`@tanstack/react-table`/`react-hook-form`.

## Состав

- `defineResource()` (`src/resource/define-resource.ts`) — только
  метаданные: колонки, схемы create/update, переопределения полей,
  права. Не хранит ни один вызов API.
- `DataTable` (`src/table/data-table.tsx`) — `@tanstack/react-table`
  v9: `useTable`, не `useReactTable` (переименован), `features:
stockFeatures` даёт поведение «всё включено» без явного списка
  фич. Таблица ничего не вычисляет сама — `manualPagination`/
  `manualSorting`/`manualFiltering`, `rowCount` приходит готовым.
- `ResourceForm` (`src/form/resource-form.tsx`) — `react-hook-form` +
  `@hookform/resolvers/zod`. Поля — из `resolveFields()`
  (`src/form/field-registry.ts`), которая читает форму схемы.
- `AdminLayout` (`src/layout/admin-layout.tsx`) — боковая навигация по
  реестру ресурсов, фильтр по `permissions.can()`. `linkComponent` —
  пропс (apps/web передаёт `@tanstack/react-router`'s `Link`),
  admin-kit не знает про роутер.
- `PermissionsProvider` (`src/permissions/provider.ts`) — интерфейс +
  три готовые реализации (`allowAll`/`denyAll`/`allowList`). Настоящий
  поставщик (M2) подключается без правок `AdminLayout`/`DataTable`/
  `ResourceForm` — проверено тестом с двумя поставщиками
  (`src/layout/admin-layout.test.tsx`).
- `LoginPage`/`ForbiddenPage`/`NotFoundPage`
  (`src/pages/service-pages.tsx`), `SystemStatusPage`
  (`src/pages/system-status-page.tsx`) — служебные страницы, формат
  `SystemStatusPage` — тот же, что отдаёт `/health/ready` (`status`/
  `details`), без собственного обёртывания.
- `AuditLogTable` (`src/audit/audit-log-table.tsx`) — тот же
  `DataTable`, колонки фиксированы (журнал, не настраиваемый ресурс).
  Запись событий — `apps/server/src/audit-log` (репозиторий,
  заглушка актора `"system"` до M1), admin-kit только читает.

## Честная граница `resolveFields()`

Генерируется примерно восемьдесят процентов плоских форм (раздел
8.1 задания) — автоматически читаются только ПРЯМЫЕ поля верхнего
уровня `z.object({...})`, по их типу (`string`/`number`/`boolean`/
`enum`) или подсказке `.meta({ widget })`. Не распознаются:

- `.refine()`/`.superRefine()` — непрозрачные предикаты без метаданных,
  межполевые правила всплывают только при отправке формы, не
  превращаются в разметку.
- Вложенные `object`/массивы — решения о раскладке, которых в схеме нет.
- Размеченные объединения (`z.discriminatedUnion`) — требуют
  перерисовки поддерева при смене различителя.

Для всего этого — `formOverrides` в `defineResource()` или ручная
форма рядом с `ResourceForm`, не попытка обойти границу внутри пакета.

## Грабли TanStack Table v9

`ColumnDef<TFeatures, TData, TValue>` — **первый** параметр теперь
`TFeatures` (фичи), не `TData`, как в v8 (`ColumnDef<TData, TValue>`).
`TData` обязан удовлетворять `RowData` (`Record<string, any> |
Array<any>`) — свободный `TData`/`TData extends object` не проходит
(`TS2707`/`TS2322`, найдено `tsc`, не по памяти). `stockFeatures` —
значение, `StockFeatures` — отдельный тип для этого параметра.

## Грабли `zodResolver` + generic-схема

`ResourceForm<TSchema extends z.ZodObject>` выводит `TValues` из
`TSchema` (`z.infer<TSchema>`), не берёт его отдельным свободным
параметром — иначе `zodResolver(schema)` и `useForm<TValues>` не
совпадают по типу ни при каком использовании. Даже так, вызов
`zodResolver` для ОБЩЕГО (не конкретного) `TSchema` выводит
`Record<string, unknown>`, не `output<TSchema>` — `tsc` не может
unify настолько абстрактный параметр функции с результатом другой
обобщённой функции. Решение — приведение типа
(`as unknown as Resolver<z.infer<TSchema>>`), не обход: во время
выполнения `zodResolver(schema)` валидирует именно ту форму, что
описывает переданная схема, приведение отражает это, а не маскирует
несоответствие.

## Как добавить ресурс

1. Схемы `createXInputSchema`/`updateXInputSchema` — уже есть в
   `packages/contract`, если ресурс там описан (обычно да).
2. `defineResource({ name, label, columns, permissions })` —
   отдельно, не внутри самого экрана.
3. В маршруте `apps/web` (`src/routes/admin/<name>.tsx`): `DataTable`
   с `api.<name>.list.queryOptions()`, `ResourceForm` со схемой
   создания и `api.<name>.create.mutationOptions()`.
4. Переопределение одного поля — `formOverrides: { поле: {...} }` в
   `defineResource()`, не переписывание всей формы.

## Звёздочка обязательного поля стоит вне `<label>`

`ResourceForm` рисует `*` у обязательных полей соседним элементом, не
внутри `<label>`. Запросы `getByLabelText`/`findByLabelText` из
`@testing-library/dom` сверяют `textContent` самого label буквально и
ARIA (в том числе `aria-hidden` на вложенном `<span>`) не учитывают.
Со звёздочкой внутри label запрос по видимой подписи («Название») не
находил поле: это вскрыл первый тест прикладного экрана
(`apps/web/src/routes/admin/tasks.test.tsx`). Регрессия закрыта тестом в
`src/form/resource-form.test.tsx`.

## Подписи (`labels`)

Пакет не знает про `react-i18next`. `DataTable`, `AdminLayout`,
`SystemStatusPage`, `AuditLogTable`, `ForbiddenPage`, `NotFoundPage` и
`LoginPage` принимают проп `labels`; незаданные ключи остаются русскими.
Типы и значения по умолчанию — `src/labels.ts`. У `DataTable` проп
`emptyLabel` имеет приоритет над `labels.empty`. `AuditLogTable` принимает
`labels` для колонок и `tableLabels` для самой таблицы; язык формата даты —
`labels.locale`. Приложения берут переводы из `adminLabels(t)`
([guides/i18n.md](../guides/i18n.md)).

## Паритет

`packages/admin-kit` — веб-только часть, в `pnpm check:parity` не
участвует вообще (сверяются только `ui-web`/`ui-native`, у admin-kit
нет и не будет мобильной пары, раздел "Фаза 8" задания, пункт 8.7).

## Ссылки

- [README.md пакета](../../packages/admin-kit/README.md)
- [web.md](../apps/web.md) — раздел `/admin`.
- `docs/BACKLOG.md` — находки Фазы 8.
