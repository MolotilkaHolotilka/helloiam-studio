# HelloIAM Stories (alpha v001)

Конструктор сторис для SMM — выбор шаблона, заполнение карточек, рендер PNG/MP4.

## Запуск

```bash
npm install
npm start          # приложение на :3456
npm run stop
npm run render -- Post126SoftFloat   # CLI-рендер одной карточки
```

Откройте http://localhost:3456

## Пайплайн пользователя

1. **Генерация** — выбрать шаблон → «Создать пост»
2. Заполнить текст, изображения, цвета **для каждой карточки**
3. **Посты** — список сохранённых постов
4. Рендер — PNG + MP4 (3 сек на карточку)

## Шаблоны

15 rubric-шаблонов из `rubric-templates-tsx/` (7-карточные карусели, deep dive, food carousel, Wizz и др.).

Импорт / обновление каталога:

```bash
npm run import:rubric
```

Файлы: `data/story-templates/*.json` · рендер: `RubricCardCss`

## Деплой (VPS)

```bash
REMOTE=helloiam-studio ./scripts/deploy-hostinger.sh
```

Gallery: https://helloiam-studio-v001.srv1681126.hstgr.cloud

## Структура

```
helloiam-studio/
├── src/gallery/           # UI (picker.html)
├── src/templates/         # Remotion-композиции карточек
├── data/story-templates/  # Описание шаблонов постов (карточки, поля)
├── tools/render/          # Рендер PNG/MP4
├── tools/gallery-sync.mjs # Синхронизация composition-manifest
├── _archive/              # Legacy: CSS-импорт, Studio (не использовать)
└── docs/PRODUCT_TZ.md       # Техническое задание
```

## Roadmap alpha v001

- [x] Промпт 1: зачистка, архив legacy, пилотный шаблон
- [x] Промпт 2–3: посты в `data/posts/`, мастер карточек, список «Посты»
- [x] Промпт 4: рендер всех карточек (PNG + MP4)
- [x] Промпт 5: прогресс рендера, валидация, ZIP-скачивание
- [x] Промпт 6: шаблоны HelloIAM (9 карточек + вино)
- [x] Промпт 7: деплой VPS, русский UI, HelloIAM Stories
- [x] Live-превью карточек, обложки шаблонов, очередь рендера, удаление постов
