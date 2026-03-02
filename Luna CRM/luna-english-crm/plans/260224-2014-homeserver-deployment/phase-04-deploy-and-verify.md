# Phase 4: Deploy and Verify

## Context Links
- [Phase 1](phase-01-configure-nextjs-standalone.md) -- standalone config
- [Phase 2](phase-02-create-docker-setup.md) -- Docker + Caddy
- [Phase 3](phase-03-create-cron-setup.md) -- cron jobs

## Overview
- **Priority**: P1
- **Status**: pending
- **Description**: Step-by-step instructions to deploy on the Dell homeserver. Covers prerequisites, first deploy, verification, and maintenance commands.

## Key Insights
- Homeserver is a laptop -- configure lid-close to keep running
- i3-4005U is slow for Docker builds -- consider building on dev machine and transferring image
- First Let's Encrypt cert requires port 80 open and DNS resolving

## Prerequisites Checklist

### Network
- [ ] Domain DNS A record points to homeserver public IP
- [ ] Router forwards port 80 (HTTP) to homeserver LAN IP
- [ ] Router forwards port 443 (HTTPS) to homeserver LAN IP
- [ ] Verify: `curl -4 ifconfig.me` shows expected public IP
- [ ] Verify: `dig +short your-domain.com` resolves to public IP

### Server
- [ ] Ubuntu with Docker + Docker Compose installed
- [ ] Git installed: `apt install git`
- [ ] Laptop lid-close set to no action: edit `/etc/systemd/logind.conf`, set `HandleLidSwitch=ignore`, then `sudo systemctl restart systemd-logind`
- [ ] (Optional) Move Docker data-root to HDD if SSD space is concern

### Supabase
- [ ] Copy `.env.local` values to `.env.production` on server
- [ ] Generate new CRON_SECRET: `openssl rand -hex 32`

## Implementation Steps

### Step 1: Clone and configure

```bash
# Clone repo
cd /opt
sudo git clone https://github.com/goonlineenglish/luna-english-crm.git luna-crm
sudo chown -R $USER:$USER /opt/luna-crm
cd /opt/luna-crm

# Create production env file
cp .env.production.template .env.production
nano .env.production
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#          SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
```

### Step 2: Configure domain in Caddyfile

```bash
# Replace placeholder domain
sed -i 's/your-domain.com/actual-domain.com/g' Caddyfile
```

### Step 3: Build and start

```bash
# Build (first time takes ~5-10 min on i3)
docker compose build

# Start in background
docker compose up -d

# Watch logs
docker compose logs -f
```

### Step 4: Verify deployment

```bash
# Check containers are running
docker compose ps

# Check app health
curl -s http://localhost:3000/login | head -5

# Check HTTPS (from another machine or use curl)
curl -s https://your-domain.com/login | head -5

# Check Caddy got SSL cert
docker compose logs caddy | grep -i "certificate"
```

### Step 5: Install cron jobs

```bash
chmod +x deploy/cron-setup.sh deploy/cron-health-check.sh
./deploy/cron-setup.sh /opt/luna-crm

# Verify
crontab -l

# Install log rotation — replace <deploy_user> with the actual OS user (e.g. ubuntu)
sudo cp deploy/logrotate-luna-crm.conf /etc/logrotate.d/luna-crm
sudo sed -i "s/<deploy_user>/$(id -un)/g" /etc/logrotate.d/luna-crm
# Verify the substitution looks correct before continuing
sudo cat /etc/logrotate.d/luna-crm
```

### Step 6: Install logrotate for Docker

```bash
# Prevent Docker container logs from filling disk
# Create /etc/docker/daemon.json if not exists
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker
```

### Step 7: Test cron endpoints manually

```bash
# Source CRON_SECRET
CRON_SECRET=$(grep '^CRON_SECRET=' /opt/luna-crm/.env.production | cut -d'=' -f2-)

# Test each endpoint
curl -sf -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-overdue-reminders
curl -sf -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/process-message-queue
curl -sf -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/refresh-tokens
curl -sf -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/weekly-report
```

## Verification Checklist
- [ ] `docker compose ps` shows both `luna-crm` and `caddy` as healthy/running
- [ ] `https://your-domain.com/login` loads with valid SSL cert
- [ ] Login with admin credentials works
- [ ] Pipeline Kanban board loads with data from Supabase
- [ ] All 4 cron endpoints return 200 when called manually
- [ ] `crontab -l` shows 4 scheduled jobs
- [ ] `docker stats --no-stream` shows memory under limits

## Maintenance Commands

```bash
# Update app (after git push)
cd /opt/luna-crm
git pull
docker compose build
docker compose up -d

# View logs
docker compose logs luna-crm --tail 100
docker compose logs caddy --tail 50

# Restart app only
docker compose restart luna-crm

# Full restart
docker compose down && docker compose up -d

# Check disk usage
df -h
docker system df

# Clean old images
docker image prune -f
docker builder prune -f

# Health check
./deploy/cron-health-check.sh
```

## Alternative: Build on Dev Machine, Transfer Image

If the i3 is too slow for Docker builds:

```bash
# On dev machine (Windows/Mac)
docker build -t luna-crm:latest .
docker save luna-crm:latest | gzip > luna-crm.tar.gz

# Transfer to homeserver
scp luna-crm.tar.gz user@homeserver:/opt/luna-crm/

# On homeserver
cd /opt/luna-crm
docker load < luna-crm.tar.gz
docker compose up -d
```

## Todo List
- [ ] Set DNS A record for domain
- [ ] Configure router port forwarding (80, 443)
- [ ] Configure laptop lid behavior
- [ ] Clone repo on server
- [ ] Create `.env.production` with real credentials
- [ ] Update Caddyfile with real domain
- [ ] `docker compose build && docker compose up -d`
- [ ] Verify HTTPS and SSL cert
- [ ] Install cron jobs
- [ ] Configure Docker log rotation
- [ ] Test all cron endpoints manually
- [ ] Run full verification checklist
- [ ] (Optional) Configure Docker data-root on HDD

## Success Criteria
- App accessible via HTTPS at custom domain
- SSL cert auto-provisioned by Caddy
- All pages load (login, pipeline, students, reminders, reports, settings)
- Cron jobs execute on schedule and log output
- System survives reboot (containers auto-restart)
- Memory usage stays under 600MB total (app + Caddy)
- SSD usage < 2GB for Docker (app image + Caddy image)

## Risk Assessment
| Risk | Mitigation |
|------|-----------|
| ISP blocks port 80/443 | Use Cloudflare Tunnel as alternative (free, no port forwarding needed) |
| Dynamic IP | Use DDNS service (e.g., DuckDNS, Cloudflare DDNS script) |
| Power outage | Laptop battery acts as UPS; containers auto-restart |
| SSD full | Move Docker to HDD, set log limits, weekly prune cron |
| SSL cert renewal fails | Caddy auto-renews 30 days before expiry; check logs monthly |

## Troubleshooting

### App won't start
```bash
docker compose logs luna-crm
# Common: missing env vars, Supabase URL wrong
```

### SSL cert not provisioning
```bash
docker compose logs caddy
# Common: DNS not resolving, port 80 blocked, rate limit
# Fix: ensure port 80 is open, DNS is correct, wait 1h if rate-limited
```

### Container keeps restarting
```bash
docker inspect luna-crm --format='{{.State.ExitCode}}'
docker compose logs luna-crm --tail 50
# Common: OOM (exit code 137) -- increase memory limit
```

### Webhooks not working
```bash
# Ensure external HTTPS URL is set in Zalo/Facebook developer console
# Webhook URLs: https://your-domain.com/api/webhooks/zalo
#               https://your-domain.com/api/webhooks/facebook
```

## Security Considerations
- Never expose port 3000 publicly (bind to 127.0.0.1 only)
- `.env.production` file permissions: `chmod 600 .env.production`
- Keep Ubuntu and Docker updated: `sudo apt update && sudo apt upgrade`
- Caddy handles TLS termination -- no need for app-level HTTPS
- Consider `ufw` firewall: allow only 22 (SSH), 80, 443

## Next Steps
- Update `docs/deployment-guide.md` with homeserver section
- Set up monitoring/alerting (optional, future)
- Configure Cloudflare Tunnel if port forwarding not possible
