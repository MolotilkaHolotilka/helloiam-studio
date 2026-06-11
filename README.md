# helloiam-studio

HelloIAM Template Studio — галерея шаблонов, импорт Figma CSS, Remotion Studio, рендер PNG/MP4.

**Полностью независим** от репозитория `hello-iam-v2` (legacy `post-ops-ui` + `helloiam-remotion`).

## Запуск (macOS)

Двойной клик: `Open Template Gallery.command`

```bash
npm install
npm run restart    # галерея :3456 + Remotion Studio :3000
npm run stop
```

## Возможности

| Функция | Как |
|---|---|
| Галерея шаблонов | http://localhost:3456 |
| Проекты AM News / AM Food | Переключатель в галерее |
| Импорт CSS | Блок в галерее или `npm run import:css -- file.css` |
| Правка props | Remotion Studio http://localhost:3000 |
| Рендер | Кнопка в галерее или `npm run render -- Post126SoftFloat` |

## Структура

```
helloiam-studio/
├── src/
│   ├── gallery/          # picker, Root, manifest
│   ├── templates/        # шаблоны (layout, schema, meta)
│   └── projects.json
├── packages/css-pipeline/  # Figma CSS → components (без legacy)
├── tools/
│   ├── css-import/
│   └── render/
├── public/generated/     # картинки для рендера
└── out/renders/          # PNG + MP4 (gitignored)
```

## Roadmap (следующие шаги)

- Docker + хостинг на VPS
- Props sync Studio → meta.json
- Очередь рендеров
