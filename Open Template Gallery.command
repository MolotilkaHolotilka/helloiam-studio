#!/bin/bash
cd "$(dirname "$0")"

echo "HelloIAM Studio — запуск…"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm не найден. Установи Node.js: https://nodejs.org"
  read -r -p "Enter чтобы закрыть…"
  exit 1
fi

npm install --silent 2>/dev/null || npm install

if ! npm run restart; then
  echo ""
  echo "Не удалось запустить. Попробуй вручную:"
  echo "  cd $(pwd) && npm run stop && npm run restart"
  read -r -p "Enter чтобы закрыть…"
  exit 1
fi
