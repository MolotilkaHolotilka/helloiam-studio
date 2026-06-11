# helloiam-studio

HelloIAM Template Studio — галерея шаблонов, импорт Figma CSS, Remotion Studio, рендер PNG/MP4.

**Полностью независим** от репозитория `hello-iam-v2` (legacy `post-ops-ui` + `helloiam-remotion`).

## Запуск (macOS)

Двойной клик: `Open Template Gallery.command`

```bash
npm install
npm start          # галерея :3456 + Remotion Studio :3000 (полный режим)
npm run gallery    # только галерея :3456 (лёгкий режим, без Studio)
npm run studio     # только Remotion Studio :3000
npm run stop
```

`npm run restart` — то же, что `preview`: освобождает порты, запускает галерею + Studio и открывает браузер.

## Два пути правки props

Оба варианта рабочие — выбирайте по задаче.

### Галерея (импорт → редактировать → рендер)

1. Импортируйте CSS в галерее или `npm run import:css -- file.css`
2. Нажмите **«Редактировать»** у шаблона — форма props в галерее
3. **Сохранить** записывает `src/templates/<slug>/meta.json` и обновляет manifest
4. **Рендер PNG+MP4** читает props из `meta.json`

### Remotion Studio (открыть → править в панели)

1. `npm start` (или `npm run studio` отдельно)
2. Нажмите **«Открыть»** у шаблона — откроется Studio с composition
3. Правьте props в правой панели Studio (defaultProps из `composition-manifest`)
4. Рендер из галереи использует сохранённый `meta.json`, не сессию Studio

> **MVP:** сохранение в галерее пишет `meta.json`. Правки в Remotion Studio живут только в сессии браузера, пока не сохраните через API галереи (кнопка «Сохранить» в режиме редактирования). Props sync Studio → meta.json автоматически — в roadmap.

## Возможности

| Функция | Как |
|---|---|
| Галерея шаблонов | http://localhost:3456 |
| Проекты AM News / AM Food | Переключатель в галерее |
| Импорт CSS | Блок в галерее или `npm run import:css -- file.css` |
| Правка props (галерея) | «Редактировать» → сохранение в `meta.json` |
| Правка props (Studio) | «Открыть» → панель props http://localhost:3000 |
| Рендер | Кнопка в галерее или `npm run render -- Post126SoftFloat` |

## Структура

```
helloiam-studio/
├── src/
│   ├── gallery/          # picker, Root, manifest
│   ├── templates/        # шаблоны (layout, schema, meta.json)
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
- Props sync Studio → meta.json (автоматически)
- Очередь рендеров
