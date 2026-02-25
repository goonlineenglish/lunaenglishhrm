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
