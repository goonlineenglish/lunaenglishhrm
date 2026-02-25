#!/bin/bash
# Quick health check -- run manually or add to monitoring
# Usage: ./cron-health-check.sh

APP_URL="http://localhost:3000"

echo "--- Luna CRM Health Check ---"
echo "App: $(curl -sf -o /dev/null -w '%{http_code}' "$APP_URL/login" || echo 'DOWN')"
echo "Containers:"
docker ps --filter "name=luna-crm" --filter "name=caddy" --format "  {{.Names}}: {{.Status}}"
echo "Memory:"
docker stats --no-stream --format "  {{.Name}}: {{.MemUsage}}" luna-crm caddy 2>/dev/null
echo "Last cron runs:"
for log in /var/log/luna-crm/*.log; do
  echo "  $(basename "$log"): $(tail -1 "$log" 2>/dev/null | head -c 80 || echo 'no logs')"
done
