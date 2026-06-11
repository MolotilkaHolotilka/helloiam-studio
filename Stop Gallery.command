#!/bin/bash
cd "$(dirname "$0")"
npm run stop
echo "Галерея и Remotion Studio остановлены."
read -r -p "Enter чтобы закрыть…"
