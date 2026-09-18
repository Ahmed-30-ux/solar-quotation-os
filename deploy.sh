#!/usr/bin/env bash
set -euo pipefail
cd /opt/solar

echo "=== Pulling latest code ==="
git pull origin main

echo "=== Installing backend dependencies ==="
cd backend
npm ci --omit=dev

echo "=== Building frontend ==="
cd ../frontend
npm ci
npm run build

echo "=== Running migrations ==="
cd ../backend
node src/config/migrate.js 2>&1 | tail -3

echo "=== Restarting service ==="
systemctl restart solar-quotation
sleep 3

STATUS=$(systemctl is-active solar-quotation)
HEALTH=$(curl -s http://127.0.0.1:5010/api/health | head -c 100)
echo "=== Service: $STATUS | Health: $HEALTH ==="

if [ "$STATUS" != "active" ]; then
  echo "DEPLOY_FAILED: service not active"
  journalctl -u solar-quotation -n 10 --no-pager
  exit 1
fi

echo "DEPLOY_OK"