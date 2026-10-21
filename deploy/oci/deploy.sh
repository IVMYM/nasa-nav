#!/usr/bin/env bash
# Update an existing OCI install (git pull, build, restart).
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/nasa-nav}"
BRANCH="${BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-moyun-nav}"

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci
npm run build

sudo systemctl restart "$SERVICE_NAME"
sleep 1
curl -fsS "http://127.0.0.1:47831/api/apod/today" | head -c 160 && echo
echo "Deploy finished. $(git rev-parse --short HEAD)"
