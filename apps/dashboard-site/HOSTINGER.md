# Деплой на Hostinger VPS (Docker + GitHub auto-deploy)

У вас **VPS** с Docker Manager (`srv1681126`, IP `187.124.164.63`).

## Два режима

| Режим | Автодеплой при push | Сложность |
|-------|---------------------|-----------|
| **Docker Manager** (UI) | Нет — только первый деплой из URL | Проще всего |
| **hostinger/deploy-on-vps** (рекомендуется) | Да — каждый `git push` в `main` | API-ключ + секреты в GitHub |

Node.js Web Apps с кнопкой «Connect GitHub» в hPanel — это **другой продукт** (shared hosting Business/Cloud), не VPS.

---

## Вариант A: автодеплой (официальный Hostinger)

### 1. GitHub

```bash
git add .
git commit -m "Add Hostinger auto-deploy"
git push origin main
```

### 2. Hostinger API

1. [hPanel → Profile → API](https://hpanel.hostinger.com/profile/api) — создайте API key
2. VM ID вашего сервера: **`1681126`** (из `srv1681126.hstgr.cloud`)

### 3. Секреты в GitHub

**Settings → Secrets and variables → Actions**

Secrets:
- `HOSTINGER_API_KEY` — API key из hPanel
- `EXA_API_KEY`
- `YOUTUBE_API_KEY`
- `SITE_PASSWORD` — пароль для входа на сайт (обязательно)

Variables:
- `HOSTINGER_VM_ID` = `1681126`

### 4. Приватный репозиторий

На VPS (Terminal в hPanel):

```bash
ssh-keygen -t ed25519 -C "dashboard-deploy" -N "" -f ~/.ssh/dashboard-deploy
cat ~/.ssh/dashboard-deploy.pub
```

Скопируйте ключ → GitHub репозиторий → **Settings → Deploy keys → Add deploy key**.

### 5. Готово

Каждый `git push` в `main` → GitHub Actions → Hostinger пересобирает контейнер.

Логи: GitHub → **Actions**; на VPS — **Docker Manager** → `dashboard-site`.

Сайт: **https://dashboard-site.srv1681126.hstgr.cloud** (HTTPS через Traefik)

Старый HTTP по IP `:3010` больше не используется.

---

## Вариант B: только Docker Manager (без автодеплоя)

1. **Docker Manager** → **Compose** → **Compose from URL**
2. URL: `https://github.com/ВАШ_ЛОГИН/dashboard_site` (или прямая ссылка на `docker-compose.yml`)
3. Имя проекта: `dashboard-site`
4. Добавьте переменные окружения в UI
5. **Deploy**

Обновление кода — вручную **Redeploy** в Docker Manager.

---

## Домен, данные, Exa

- Данные в Docker volume `dashboard-data` (не теряются при пересборке)
- Первый запуск — архив пустой, нажмите «Собрать» или дождитесь cron
- IP VPS другой — Exa может работать без Cloudflare 403

