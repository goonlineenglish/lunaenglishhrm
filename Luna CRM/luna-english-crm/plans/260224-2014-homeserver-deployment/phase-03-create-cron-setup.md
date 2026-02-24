# Phase 3: Create Cron Setup

## Context Links
- [Cron API routes](../../app/api/cron/)
- [Deployment guide](../../docs/deployment-guide.md) -- existing cron schedule reference
- [System architecture](../../docs/system-architecture.md) -- cron endpoint docs

## Overview
- **Priority**: P1
- **Status**: pending
- **Description**: Set up host-level crontab to call 4 cron API endpoints via curl. Simplest approach -- no extra container, no dependency.

## Key Insights
- All cron endpoints use `Authorization: Bearer $CRON_SECRET` header
- Using host crontab (not container cron) -- survives container restarts, simpler to manage
- curl to `localhost:3000` -- no TLS overhead for internal calls
- Redirect output to log files on HDD for debugging
- All endpoints are idempotent (safe to retry)

## Requirements
### Functional
- 4 cron jobs running on schedule:
  1. `check-overdue-reminders` -- every 15 minutes
  2. `process-message-queue` -- every 5 minutes
  3. `refresh-tokens` -- daily at 6:00 AM (Vietnam time, UTC+7 = 23:00 UTC-1 day)
  4. `weekly-report` -- Monday 8:00 AM Vietnam time (= 01:00 UTC Monday)
- Each job logs output with timestamp
- Failed requests don't block other jobs

### Non-functional
- Log rotation to prevent disk fill
- Timeout per request (30s for most, 60s for weekly-report)

## Related Code Files
### Files to Create
- `deploy/cron-setup.sh` -- installs crontab entries
- `deploy/cron-health-check.sh` -- optional health probe script

### Files to Modify
- None (host-level config)

## Implementation Steps

### 1. Create `deploy/cron-setup.sh`

```bash
#!/bin/bash
# Luna CRM Cron Setup
# Run this on the homeserver after deployment.
# Reads CRON_SECRET from .env.production in the project directory.

set -euo pipefail

PROJECT_DIR="${1:-/opt/luna-crm}"
LOG_DIR="/var/log/luna-crm"
ENV_FILE="$PROJECT_DIR/.env.production"

# Validate env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Create it first."
  exit 1
fi

# Extract CRON_SECRET
CRON_SECRET=$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d'=' -f2-)
if [ -z "$CRON_SECRET" ]; then
  echo "ERROR: CRON_SECRET not set in $ENV_FILE"
  exit 1
fi

# Create log directory
sudo mkdir -p "$LOG_DIR"
sudo chown "$USER:$USER" "$LOG_DIR"

# Write crontab
CRON_CONTENT=$(cat <<EOF
# Luna English CRM - Cron Jobs
# Installed by deploy/cron-setup.sh
# Logs: $LOG_DIR/

# Process message queue - every 5 minutes
*/5 * * * * curl -sf --max-time 30 -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/process-message-queue >> $LOG_DIR/message-queue.log 2>&1

# Check overdue reminders - every 15 minutes
*/15 * * * * curl -sf --max-time 30 -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-overdue-reminders >> $LOG_DIR/reminders.log 2>&1

# Refresh integration tokens - daily at 23:00 UTC (6:00 AM UTC+7)
0 23 * * * curl -sf --max-time 30 -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/refresh-tokens >> $LOG_DIR/refresh-tokens.log 2>&1

# Weekly report - Monday 01:00 UTC (8:00 AM UTC+7)
0 1 * * 1 curl -sf --max-time 60 -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/weekly-report >> $LOG_DIR/weekly-report.log 2>&1
EOF
)

# Preserve existing crontab, append Luna CRM jobs
(crontab -l 2>/dev/null | grep -v "luna-crm\|Luna English CRM\|process-message-queue\|check-overdue-reminders\|refresh-tokens\|weekly-report"; echo "$CRON_CONTENT") | crontab -

echo "Cron jobs installed. Verify with: crontab -l"
echo "Logs at: $LOG_DIR/"
```

### 2. Create log rotation config

```bash
# deploy/logrotate-luna-crm.conf
# Copy to /etc/logrotate.d/luna-crm on the homeserver

/var/log/luna-crm/*.log {
    weekly
    rotate 4
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
```

### 3. Create `deploy/cron-health-check.sh`

```bash
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
```

## Todo List
- [ ] Create `deploy/` directory
- [ ] Create `deploy/cron-setup.sh`
- [ ] Create `deploy/logrotate-luna-crm.conf`
- [ ] Create `deploy/cron-health-check.sh`
- [ ] Make scripts executable: `chmod +x deploy/*.sh`
- [ ] Test cron-setup.sh locally (dry run)

## Success Criteria
- `crontab -l` shows all 4 jobs after running setup script
- Curl commands succeed when app is running
- Log files rotate weekly, keeping 4 weeks
- Health check script reports container status

## Risk Assessment
| Risk | Mitigation |
|------|-----------|
| Cron runs before app starts after reboot | Docker `restart: unless-stopped` + healthcheck; cron curl fails silently, retries on next schedule |
| Log disk fill | logrotate config keeps max 4 weeks compressed |
| Wrong timezone | All schedules in UTC; comments show Vietnam time equivalent |

## Security Considerations
- CRON_SECRET extracted from `.env.production` (never hardcoded in crontab)
- curl uses `-sf` (silent, fail on error) -- no secret leakage in logs
- Log directory permissions: owner-only read/write

## Next Steps
- Phase 4: deploy on homeserver (depends on Phase 1-3)
