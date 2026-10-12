# docs-site

Сайт документации (раздел "Фаза 10" задания, пункт 10.3) — VitePress,
содержимое читает прямо из `docs/` в корне репозитория (`srcDir` в
`apps/docs/.vitepress/config.ts`), плюс несколько страниц, которые
`scripts/generate.ts` порождает из репозитория перед каждой сборкой
(`docs/generated/` — в `.gitignore`, не коммитится). Подробности —
[docs/apps/docs.md](../../docs/apps/docs.md).

```bash
pnpm --filter docs-site dev      # генерация + локальный предпросмотр
pnpm --filter docs-site build    # генерация + статическая сборка
pnpm --filter docs-site preview  # просмотр уже собранного apps/docs/.vitepress/dist
```
