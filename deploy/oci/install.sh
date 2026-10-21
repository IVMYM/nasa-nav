#!/usr/bin/env bash
# First-time setup on OCI Ubuntu (ARM). Run on the server as a user with sudo.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/nasa-nav}"
REPO_URL="${REPO_URL:-https://github.com/IVMYM/nasa-nav.git}"
BRANCH="${BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-moyun-nav}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install Node 20+ (e.g. NodeSource or nvm), then re-run."
  exit 1
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci
npm run build

sudo cp deploy/oci/moyun-nav.service "/etc/systemd/system/${SERVICE_NAME}.service"
sudo sed -i "s|/home/ubuntu/nasa-nav|${APP_DIR}|g" "/etc/systemd/system/${SERVICE_NAME}.service"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

if command -v nginx >/dev/null 2>&1; then
  sudo cp deploy/oci/nginx-nav.conf /etc/nginx/sites-available/nav.xxznote.eu.org
  sudo ln -sf /etc/nginx/sites-available/nav.xxznote.eu.org /etc/nginx/sites-enabled/nav.xxznote.eu.org
  sudo nginx -t
  sudo systemctl reload nginx
  echo "Nginx reloaded. Ensure Cloudflare DNS points to this host."
else
  echo "Nginx not installed; app listens on http://127.0.0.1:47831"
fi

systemctl --no-pager status "$SERVICE_NAME" || true
curl -fsS "http://127.0.0.1:47831/api/site" | head -c 120 && echo
