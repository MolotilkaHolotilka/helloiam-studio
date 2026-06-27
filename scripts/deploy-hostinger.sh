#!/usr/bin/env bash
# Deploy helloiam-studio to Hostinger VPS (run from your Mac).
set -euo pipefail

LOCAL_DIR="${LOCAL_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
REMOTE="${REMOTE:-root@187.124.164.63}"
REMOTE_DIR="${REMOTE_DIR:-/docker/helloiam-studio_v0.0.1}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.hostinger.yaml}"

if [[ -n "${SSHPASS:-}" ]]; then
  if ! command -v sshpass >/dev/null; then
    echo "Install sshpass: brew install hudochenkov/sshpass/sshpass" >&2
    exit 1
  fi
  SSH=(sshpass -e ssh -o StrictHostKeyChecking=no)
  RSYNC=(rsync -avz --progress -e "sshpass -e ssh -o StrictHostKeyChecking=no")
else
  SSH=(ssh -o StrictHostKeyChecking=accept-new)
  RSYNC=(rsync -avz --progress -e "ssh -o StrictHostKeyChecking=accept-new")
fi

RSYNC_EXCLUDES=(
  --exclude node_modules
  --exclude apps/dashboard-site/node_modules
  --exclude apps/dashboard-site/.next
  --exclude .git
  --exclude out/renders
  --exclude '*.mp4'
  --exclude .env
)

echo "==> Remote prep: ${REMOTE}:${REMOTE_DIR}"
"${SSH[@]}" "$REMOTE" "mkdir -p ${REMOTE_DIR}/public/generated ${REMOTE_DIR}/out/renders ${REMOTE_DIR}/data/posts ${REMOTE_DIR}/data/story-templates ${REMOTE_DIR}/data ${REMOTE_DIR}/src/lib ${REMOTE_DIR}/src/templates ${REMOTE_DIR}/src/gallery ${REMOTE_DIR}/ALL\\ EMOJIS"

echo "==> Rsync code"
"${RSYNC[@]}" "${RSYNC_EXCLUDES[@]}" "${LOCAL_DIR}/" "${REMOTE}:${REMOTE_DIR}/"

echo "==> Ensure .env on server"
"${SSH[@]}" "$REMOTE" "cd ${REMOTE_DIR} && test -f .env || cp .env.hostinger.example .env"

echo "==> Docker build & up (${COMPOSE_FILE})"
"${SSH[@]}" "$REMOTE" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} --env-file .env up -d --build"

echo "==> Health check"
"${SSH[@]}" "$REMOTE" "docker exec helloiam-studio_v0.0.1 node -e \"fetch('http://127.0.0.1:3456/api/story-templates').then(r=>r.json()).then(d=>{if(!d.templates?.length)process.exit(1);console.log('templates:',d.templates.length)}).catch(()=>process.exit(1))\""

echo ""
echo "Done. Gallery: https://helloiam-studio-v001.srv1681126.hstgr.cloud"
