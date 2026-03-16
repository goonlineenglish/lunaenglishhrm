# Luna HRM — Optimal Ubuntu Self-Host Configuration Guide

**For:** DevOps engineers, infrastructure team
**Project:** Luna HRM (Self-hosted on Ubuntu)
**Date:** 2026-03-16
**Status:** Production-ready configuration recommendations

---

## Overview: Self-Hosted vs Cloud

| Aspect | Self-Hosted Ubuntu | Supabase Cloud |
|--------|-------------------|-----------------|
| **App Server** | Ubuntu VM (managed by you) | ✅ Included |
| **Database** | Supabase Cloud PostgreSQL | ✅ Included |
| **Cost** | ~$15-120/month (hardware) | Free tier or Supabase paid |
| **Control** | Full (firewall, monitoring) | Limited (Supabase managed) |
| **Scaling** | Manual (upgrade CPU/RAM) | Auto-scaling (Supabase Pro) |
| **Backups** | Your responsibility | ✅ Supabase auto-backups |
| **Expertise** | Linux/networking required | Minimal (cloud-native) |

---

## Part 1: Hardware & OS Recommendations

### Hardware Tiers

Choose based on employee count + concurrent users:

#### Small (50-100 employees, 10-50 concurrent)

```
CPU:     2 cores (2.0+ GHz)
RAM:     4GB minimum, 4GB recommended
Storage: 50GB SSD (system + logs)
Network: 100 Mbps (residential/small business fiber)
Uptime:  99%+ (allow 1-2 hours/week maintenance)
```

**Cost estimate:** $10-15/month (Linode, DigitalOcean, Hetzner)
**Use case:** Small center, 1-2 locations, limited payroll volume

---

#### Medium (200-500 employees, 50-200 concurrent)

```
CPU:     4 cores (2.5+ GHz)
RAM:     8GB minimum, 16GB recommended
Storage: 100GB SSD (OS + app + logs, 50% headroom)
Network: 500 Mbps upload/download
Uptime:  99.5% (max 3-4 hours/month downtime)
```

**Cost estimate:** $30-50/month
**Use case:** Multi-location center, moderate payroll, real-time analytics

---

#### Large (1000+ employees, 500+ concurrent)

```
CPU:     8 cores (3.0+ GHz)
RAM:     16GB minimum, 32GB recommended
Storage: 200-500GB SSD (primary) + 500GB backup disk
Network: 1Gbps (dedicated fiber)
Uptime:  99.9% (max 43 minutes/month downtime)
Redundancy: 2+ servers with load balancing (future)
```

**Cost estimate:** $80-120/month
**Use case:** Large enterprise, multiple branches, high-volume payroll

---

### OS Selection: Ubuntu 22.04 LTS

**Why Ubuntu 22.04 LTS?**

```
✅ Long-term support (until 2027)
✅ Latest Node.js (18+) available
✅ PM2 + Caddy well-tested
✅ Large community support
✅ Regular security patches (5 years)
✅ No license cost
```

**Installation:**

1. Download Ubuntu 22.04 LTS ISO: [ubuntu.com/download/server](https://ubuntu.com/download/server)
2. Create bootable USB or use cloud provider's image
3. Install minimal (no GUI needed for server)
4. Set static IP address (critical for production)

```bash
# After OS install, verify
lsb_release -a
# Output: Ubuntu 22.04 LTS

uname -r
# Output: 5.15.x or later
```

---

### Storage Planning

**Breakdown for 50GB SSD (Small deployment):**

```
/                    5 GB   (OS, system)
/opt/luna-hrm        10 GB  (app code + node_modules)
/var/log             5 GB   (PM2, Caddy logs)
/home/app            10 GB  (.env.local, secrets, backups)
/tmp                 5 GB   (temp files)
Reserved             10 GB  (system reserved)
─────────────────────────
Total                50 GB
```

**Growth projection (per year):**

- Audit logs: ~100MB/month (can clean old logs)
- Application code: ~200MB (stays stable)
- System files: ~500MB/year
- **Result:** 50GB SSD = 3-5 years storage for small deployment

**If running out of space:**

```bash
# Check disk usage
df -h

# Find large files/directories
du -sh /var/log/*
du -sh /opt/luna-hrm/*

# Clean old audit logs (see below)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '6 months';

# Clean old logs
rm -f /var/log/caddy/luna-hrm.log.*.gz
```

---

## Part 2: Network & Firewall Configuration

### Firewall Rules (UFW)

**Default: Block all except SSH, HTTP, HTTPS**

```bash
# Enable UFW
sudo ufw enable

# Default policy: deny incoming, allow outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (22) — change to custom port if desired
sudo ufw allow 22/tcp

# Allow HTTP (80) → redirects to HTTPS
sudo ufw allow 80/tcp

# Allow HTTPS (443)
sudo ufw allow 443/tcp

# Block internal port (3001 is only accessible via Caddy)
# Do NOT expose 3001 directly

# Verify rules
sudo ufw status verbose
```

**Output example:**

```
Status: active

     To                         Action      From
     --                         ------      ----
22/tcp                         ALLOW       Anywhere
80/tcp                         ALLOW       Anywhere
443/tcp                        ALLOW       Anywhere
22/tcp (v6)                    ALLOW       Anywhere (v6)
80/tcp (v6)                    ALLOW       Anywhere (v6)
443/tcp (v6)                   ALLOW       Anywhere (v6)
```

### DNS Configuration

**Point domain to server IP:**

1. Get your server's public IP:

```bash
curl https://ifconfig.me
# Output: 203.x.x.x
```

2. Go to domain registrar (GoDaddy, Namecheap, etc.)
3. Add DNS **A record:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 203.x.x.x | 3600 |
| A | hrm | 203.x.x.x | 3600 |

**After 5-10 minutes, verify:**

```bash
nslookup hrm.buttercup.edu.vn
# Output: Name: hrm.buttercup.edu.vn
#         Address: 203.x.x.x
```

### SSL/TLS: Caddy Auto-Renewal

Caddy automatically:

```
1. Detects domain from Caddyfile
2. Requests certificate from Let's Encrypt
3. Renews 30 days before expiry (auto)
4. Reloads without downtime
```

**Verify certificate:**

```bash
# Check certificate details
echo | openssl s_client -servername hrm.buttercup.edu.vn \
  -connect hrm.buttercup.edu.vn:443 2>/dev/null \
  | openssl x509 -noout -dates

# Output: notBefore=Mar 16 00:00:00 2026 GMT
#         notAfter=Jun 14 23:59:59 2026 GMT
```

---

## Part 3: Software Stack & Directory Structure

### Step 1: Install Required Packages

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Node.js 18 LTS (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# npm (included with Node.js, verify)
npm --version  # Should be 9+

# PM2 (global process manager)
sudo npm install -g pm2

# Caddy (reverse proxy + HTTPS)
sudo apt install -y caddy

# Git
sudo apt install -y git

# Build tools (for native npm packages)
sudo apt install -y build-essential python3

# Utilities
sudo apt install -y curl wget htop vim

# Optional: ufw (firewall)
sudo apt install -y ufw

# Optional: logrotate (log rotation)
sudo apt install -y logrotate

# Verify installations
node --version   # v18.x.x
npm --version    # 9.x.x
pm2 --version    # 5.x.x
caddy --version  # v2.x.x
```

### Step 2: Directory Structure

```bash
# Create app directory
sudo mkdir -p /opt/luna-hrm
cd /opt/luna-hrm

# Create app user (non-root, security best practice)
sudo useradd -m -s /bin/bash luna-app
sudo chown -R luna-app:luna-app /opt/luna-hrm

# Create log directories
sudo mkdir -p /var/log/luna-hrm
sudo chown luna-app:luna-app /var/log/luna-hrm

# Switch to app user
su - luna-app

# Clone repo (as luna-app user)
git clone https://github.com/goonlineenglish/luna-english-crm.git .
cd Luna\ HRM/luna-hrm

# Verify permissions
ls -la
# Output: drwxr-xr-x luna-app luna-app
```

### Step 3: Environment Setup

**Create `.env.local` (as app user):**

```bash
# Create with restricted permissions
touch .env.local
chmod 600 .env.local

# Edit
nano .env.local
```

**`.env.local` template:**

```bash
# ===== Supabase (from Dashboard) =====
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]

# ===== Cron Security =====
# Generate: openssl rand -hex 32
CRON_SECRET=[HEX_VALUE_32_BYTES]

# ===== App URL =====
NEXT_PUBLIC_APP_URL=https://hrm.buttercup.edu.vn

# ===== Optional: Resend (Phase 6) =====
RESEND_API_KEY=re_[YOUR_KEY]
```

**Verify file is secure:**

```bash
ls -l .env.local
# Output: -rw------- (600 = only owner can read)
```

---

## Part 4: Performance Tuning

### PM2 Configuration

**Create `ecosystem.config.js` (in project root):**

```javascript
module.exports = {
  apps: [
    {
      name: 'luna-hrm',
      script: 'npm',
      args: 'start',
      instances: 4,  // For 4-core CPU; use 2 for 2-core
      exec_mode: 'cluster',

      // Memory limits
      max_memory_restart: '1G',  // Restart if exceeds 1GB

      // Watch for crashes
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Environment
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512'  // 512MB per worker
      },

      // Logging
      out_file: '/var/log/luna-hrm/out.log',
      error_file: '/var/log/luna-hrm/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 5000
    }
  ]
};
```

**Start with ecosystem config:**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Node.js Memory Settings

**For 4GB RAM server with 4 workers:**

```bash
# Each worker gets ~512MB
# Total: 4 workers × 512MB = 2GB (leaves 2GB for system)

# Already set in ecosystem.config.js:
NODE_OPTIONS='--max-old-space-size=512'
```

**Monitor memory usage:**

```bash
pm2 monit
# Shows CPU%, memory, uptime for each worker
```

### Caddy Caching Headers

**Update Caddyfile for optimal Next.js caching:**

```caddy
hrm.buttercup.edu.vn {
    reverse_proxy localhost:3001 {
        flush_interval -1
    }

    # Cache static assets (Next.js /public, /_next/static)
    @static path /_next/static/* /public/*
    header @static Cache-Control "public, max-age=31536000, immutable"

    # Don't cache HTML (always fetch)
    @html path *.html
    header @html Cache-Control "public, max-age=0, must-revalidate"

    # Don't cache API routes
    @api path /api/*
    header @api Cache-Control "no-store"

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
    }

    encode gzip

    log {
        output file /var/log/caddy/luna-hrm.log {
            roll_size 100mb
            roll_keep 5
        }
    }
}
```

### Supabase Connection Pooling

Luna HRM uses **shared Supabase client** to prevent N+1 queries. No additional config needed.

**Verify connection pooling:**

```bash
# Check Supabase dashboard → Monitoring → Connections
# Should see ~4-8 connections (one per PM2 worker)
```

---

## Part 5: Monitoring & Logging

### PM2 Monitoring

**Real-time monitoring:**

```bash
pm2 monit
# Interactive dashboard, Ctrl+C to exit
```

**Log rotation (PM2 auto-rotates):**

```bash
pm2 logs luna-hrm | head -100
pm2 logs luna-hrm --err   # Error logs only
pm2 logs luna-hrm --out   # Output logs only
```

**Keep last 10MB of logs:**

```bash
pm2 install pm2-auto-pull

pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7  # Keep 7 days
```

### Caddy Log Rotation

**Configured in Caddyfile (automatic):**

```caddy
log {
    output file /var/log/caddy/luna-hrm.log {
        roll_size 100mb      # Rotate at 100MB
        roll_keep 5          # Keep 5 old files
    }
}
```

**Manual monitoring:**

```bash
tail -f /var/log/caddy/luna-hrm.log

# Check disk usage
du -sh /var/log/caddy/

# Manual cleanup (if needed)
find /var/log/caddy/ -name "*.log.*" -mtime +7 -delete  # Remove logs older than 7 days
```

### System Performance Monitoring

```bash
# Check CPU usage
top -b -n 1 | head -15

# Check memory
free -h

# Check disk I/O
iostat -x 1 5  # 5 samples, 1 sec interval

# Check network
netstat -tln | grep LISTEN
```

### Application Performance Metrics

**Key metrics to track:**

| Metric | Threshold | Action |
|--------|-----------|--------|
| **CPU** | >80% (5min avg) | Alert / Scale up |
| **Memory** | >90% used | Alert / Increase RAM |
| **Disk** | >85% used | Alert / Clean logs / Scale storage |
| **PM2 restarts** | >5/hour | Alert / Check error logs |
| **Caddy errors** | >100/hour | Alert / Check configs |
| **Supabase connections** | >20 | Alert / Check for leaks |

**Monitor script (save as `monitor.sh`):**

```bash
#!/bin/bash

while true; do
  CPU=$(top -b -n 1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
  MEM=$(free -h | grep Mem | awk '{print $3 "/" $2}')
  DISK=$(df -h / | awk 'NR==2 {print $5}')
  PM2_RESTARTS=$(pm2 show luna-hrm | grep "restarts" | awk '{print $NF}')

  echo "[$(date)] CPU: ${CPU}% | MEM: ${MEM} | DISK: ${DISK} | PM2 Restarts: ${PM2_RESTARTS}"

  sleep 60
done
```

**Run in background:**

```bash
chmod +x monitor.sh
nohup ./monitor.sh > monitor.log 2>&1 &
```

---

## Part 6: Security Hardening

### SSH Security

**Disable password login (use key-based only):**

```bash
sudo nano /etc/ssh/sshd_config

# Change/add these lines:
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
X11Forwarding no
```

**Restart SSH:**

```bash
sudo systemctl restart sshd

# Verify (from client)
ssh -i ~/.ssh/id_rsa root@203.x.x.x  # Should work
ssh -i ~/.ssh/id_rsa ubuntu@203.x.x.x  # Should work
```

### Fail2ban: Brute-Force Protection

```bash
# Install
sudo apt install -y fail2ban

# Start
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check blocked IPs
sudo fail2ban-client status sshd
```

### Environment Variable Security

**`.env.local` must NEVER be committed or world-readable:**

```bash
# Permissions
chmod 600 .env.local

# Verify
ls -l .env.local
# Output: -rw------- luna-app luna-app .env.local

# Backup securely (encrypted)
tar czf luna-hrm-backup-$(date +%Y%m%d).tar.gz .env.local
gpg -e luna-hrm-backup-*.tar.gz  # Encrypt with GPG
```

### Regular OS Patches

**Automatic security updates:**

```bash
sudo apt install -y unattended-upgrades

sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
# Uncomment: Unattended-Upgrade::Mail "root";
# Uncomment: Unattended-Upgrade::AutoReboot "true";

sudo systemctl start unattended-upgrades
sudo systemctl enable unattended-upgrades
```

**Manual updates (monthly):**

```bash
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y

# Reboot if kernel was updated
sudo reboot
```

### HTTPS Enforcement

**Caddy auto-redirects HTTP → HTTPS:**

```caddy
hrm.buttercup.edu.vn {
    # This automatically redirects http://... to https://...
    reverse_proxy localhost:3001
}
```

**Verify:**

```bash
# Test redirect
curl -I http://hrm.buttercup.edu.vn
# Output: HTTP/1.1 307 Temporary Redirect
#         Location: https://...
```

---

## Part 7: Backup & Disaster Recovery

### Database Backup Strategy

**Option 1: Supabase Automatic Backups (recommended)**

Supabase automatically backs up your database:

```
Free tier: 7-day automatic backups
Paid tier: 30-day automatic backups
```

**Access backups:**

1. Supabase Dashboard → Settings → Backups
2. Download backup as `.sql` file
3. Store securely (encrypted cloud storage)

**Option 2: Manual Database Export**

```bash
# Via Supabase SQL Editor (weekly)
-- Export all data
SELECT * FROM employees;
SELECT * FROM payslips;
SELECT * FROM attendance;
-- ... export via copy/paste or API

# Or via psql (if you have direct access)
pg_dump postgres://[USER]:[PASS]@[HOST]:5432/postgres \
  > luna-hrm-backup-$(date +%Y%m%d).sql

# Encrypt backup
gpg -e luna-hrm-backup-*.sql

# Upload to secure storage
# e.g., Google Drive, AWS S3, Azure Blob, Dropbox
```

### Application Code Backup

```bash
# Backup .env.local (encrypted)
cp .env.local .env.local.backup
gpg -e .env.local.backup

# Backup git history (already on GitHub)
git clone --mirror https://github.com/goonlineenglish/luna-english-crm.git luna-hrm.git

# Compress and encrypt
tar czf luna-hrm-$(date +%Y%m%d).tar.gz .env.local* /.env*
gpg -e luna-hrm-*.tar.gz

# Upload
# rsync to NAS / upload to cloud storage / copy to USB
```

### RTO & RPO

**Recovery Time Objective (RTO):** How fast to restore

```
Small deployment:  15-30 minutes
 - Provision new VM
 - Install Node.js, PM2, Caddy
 - Clone repo
 - Restore .env.local
 - Run migrations (if needed)
 - Start PM2

Medium deployment: 30-60 minutes
 - Same as above, plus full DB restore from backup

Large deployment:  2-4 hours
 - May need load balancer, multiple servers
```

**Recovery Point Objective (RPO):** How much data loss acceptable

```
Current setup: 24 hours
 - Supabase auto-backup daily
 - If disaster at 2PM, lose last 24 hours of data

Recommendation: Add daily export + offsite backup
 - Supabase auto-backup (Supabase's responsibility)
 - + Daily manual export (your backup)
 - = 24-hour RPO
```

### Quarterly Restore Test

**Every 3 months, practice restore:**

```bash
# 1. Download latest backup
# 2. Create new Supabase project (or use dev project)
# 3. Restore schema + data from backup
# 4. Test application works with restored DB
# 5. Document any issues
# 6. Delete test project (free tier cleanup)
```

---

## Part 8: Scaling & Maintenance

### Vertical Scaling (More CPU/RAM)

**When to upgrade:**

```
CPU usage consistently >80%
 → Upgrade from 2-core to 4-core
 → Update PM2 instances: 2 → 4 workers

Memory usage consistently >80%
 → Upgrade from 4GB to 8GB RAM
 → Increase NODE_OPTIONS --max-old-space-size (512 → 1024)

Disk usage >80%
 → Add additional disk
 → Move logs to separate partition
```

**Upgrade procedure:**

```bash
# 1. Backup .env.local + database
# 2. Stop application
pm2 stop luna-hrm

# 3. Stop Caddy
sudo systemctl stop caddy

# 4. Request server upgrade from host (usually requires restart)
# 5. Wait for upgrade (usually 2-10 minutes)
# 6. Verify new resources
free -h  # Should show more RAM
nproc    # Should show more CPU cores

# 7. Update ecosystem.config.js if CPU cores changed
# 8. Restart PM2
pm2 restart luna-hrm

# 9. Restart Caddy
sudo systemctl restart caddy

# 10. Test application
curl https://hrm.buttercup.edu.vn
```

### Horizontal Scaling (Multiple Servers)

**Not supported in current setup**, but possible future path:

```
Option 1: Load Balancer + Multiple App Servers
 - Nginx/HAProxy load balancer (distributes traffic)
 - 2-3 Ubuntu servers running Luna HRM
 - Shared Supabase Cloud database
 - Shared Caddy SSL certificates

Option 2: Containerization (Docker)
 - Package Luna HRM in Docker image
 - Deploy via Docker Swarm or Kubernetes
 - Auto-scale based on load
```

**For now:** Start with single server, upgrade vertically as needed

### Scheduled Maintenance Windows

**Recommended: 1st Sunday of month, 01:00 UTC+7 (midnight Vietnam time)**

```
- Low activity (early morning)
- Predictable for stakeholders
- Scheduled for:
  * OS patches (apt upgrade)
  * PM2 updates
  * Caddy updates
  * Database cleanup
  * Monitoring script updates
```

**Notification before maintenance:**

```bash
# 24 hours before: Notify users
# 1 hour before: Final backup
# During: Monitoring active
# 15 min after: Verification complete
# 30 min after: All-clear notification
```

### Blue-Green Deployment (Zero Downtime Updates)

**For critical updates without downtime:**

```bash
# 1. Start new "green" app on port 3002
npm start -- -p 3002 &

# 2. Test green app (health checks, smoke tests)
curl http://localhost:3002

# 3. Update Caddy to proxy to 3002 instead of 3001
# 4. Reload Caddy (no downtime)
sudo systemctl reload caddy

# 5. Stop old "blue" app on port 3001
pm2 stop luna-hrm-3001

# 6. Verify traffic is healthy
# 7. Clean up old process

# Result: Zero downtime, instant rollback possible
```

---

## Part 9: Cost Estimate

### Small Deployment (50-100 employees)

| Component | Provider | Cost/Month | Notes |
|-----------|----------|-----------|-------|
| **Server** | Hetzner/Linode | $12 | 2-core, 4GB RAM, 50GB SSD |
| **Domain** | GoDaddy/Namecheap | $0.85 | $10/year ÷ 12 months |
| **Supabase Cloud** | Supabase | Free | Free tier 500MB, or $25 Pro |
| **Email (Phase 6)** | Resend | Free | 100 emails/day free |
| **Backups** | Local/Google Drive | $0-2 | Free or paid cloud storage |
| | **TOTAL** | **$13-15/month** | |

---

### Medium Deployment (200-500 employees)

| Component | Provider | Cost/Month | Notes |
|-----------|----------|-----------|-------|
| **Server** | DigitalOcean/Linode | $40 | 4-core, 8GB RAM, 100GB SSD |
| **Domain** | Namecheap | $0.85 | $10/year ÷ 12 months |
| **Supabase Cloud** | Supabase | $25+ | Pro tier, 5GB storage |
| **Email (Phase 6)** | Resend | $20-100 | 100-1000 emails/day |
| **Monitoring** | Uptime Robot | $10 | External uptime monitoring |
| **Backups** | AWS S3 | $2-5 | Automated incremental backups |
| | **TOTAL** | **$98-160/month** | |

---

### Large Deployment (1000+ employees)

| Component | Provider | Cost/Month | Notes |
|-----------|----------|-----------|-------|
| **Servers** | AWS/DigitalOcean | $80-120 | 8-core, 16GB RAM, 200GB SSD (primary) |
| **Backup Server** | AWS | $40-50 | Secondary for redundancy |
| **Domain** | Namecheap | $0.85 | Enterprise domain ($15/year) |
| **Supabase Cloud** | Supabase | $25+ | Pro tier, 50+ GB storage |
| **Email (Phase 6)** | AWS SES/Resend | $100+ | High-volume email service |
| **CDN** | Cloudflare | $20+ | Cache + DDoS protection |
| **Monitoring** | Datadog/New Relic | $50+ | Advanced APM + alerts |
| **Backups** | AWS S3 + Glacier | $10-20 | Redundant offsite backups |
| **Load Balancer** | AWS ELB | $30 | Traffic distribution (if scaled) |
| | **TOTAL** | **$355-550/month** | |

---

## Part 10: Quick Reference Checklist

### Pre-Deployment Checklist

```
□ Hardware: Check CPU, RAM, SSD meets recommendation
□ OS: Ubuntu 22.04 LTS installed + updated
□ Network: Static IP configured, DNS A record set
□ Firewall: UFW rules (22, 80, 443) configured
□ Domain: SSL certificate auto-renewal via Caddy
□ Git: Repository cloned to /opt/luna-hrm
□ Node.js: v18+ installed globally
□ PM2: Installed and configured
□ Caddy: Installed and configured with Caddyfile
□ Supabase: Project created, keys obtained
□ .env.local: Created with secure permissions (600)
□ Database: 12 migrations run in order
□ Seed data: 21 employees created + seeded
□ Application: npm install && npm run build (0 errors)
□ PM2: app started via ecosystem.config.js
□ Tests: pm2 logs luna-hrm (healthy, no errors)
```

### Post-Deployment Checklist

```
□ Login: Test with admin@luna-hrm.local / Luna@2026
□ Database: Verify 21 employees, 10 classes
□ Payroll: Create period, verify calculations
□ Attendance: Mark attendance, verify grid saves
□ Cron: Verify 4 cron jobs scheduled
□ Monitoring: pm2 monit shows healthy metrics
□ Logs: No errors in pm2 logs
□ HTTPS: Verify certificate valid (browser green lock)
□ Caddy: Verify logs rotating (100MB limit)
□ Backups: First manual backup created + encrypted
□ Monitoring: Set up alerts (CPU, memory, disk)
```

---

## Support & Troubleshooting

**Common Issues:**

| Issue | Solution |
|-------|----------|
| **SSH timeout** | Check firewall (port 22 open?), verify static IP |
| **Build fails** | `rm -rf .next && npm run build`, check Node version |
| **PM2 restart loop** | Check `pm2 logs luna-hrm`, likely OOM (increase RAM) |
| **Caddy 502 error** | Check `pm2 monit`, verify port 3001 listening |
| **SSL certificate error** | Verify domain DNS resolves, wait 5-10 min for renewal |
| **Database connection failed** | Check Supabase keys in .env.local, verify network outbound |
| **Cron 401 unauthorized** | Verify CRON_SECRET matches in .env.local and crontab |

**Get help:**

```bash
# Check logs
pm2 logs luna-hrm
sudo tail -f /var/log/caddy/luna-hrm.log

# Check system
free -h
df -h
ps aux | grep node

# Check network
netstat -tln | grep 3001
curl http://localhost:3001
```

---

## Next Steps

1. ✅ Choose hardware tier (small/medium/large)
2. ✅ Provision Ubuntu 22.04 server
3. ✅ Configure firewall & network
4. ✅ Install software stack
5. ✅ Follow DEPLOY-INSTRUCTIONS.md
6. ✅ Set up monitoring
7. ✅ Configure backups
8. ✅ Test disaster recovery (quarterly)

---

**Ready to deploy! 🚀**

Questions? See `DEPLOY-INSTRUCTIONS.md` or contact your DevOps team.
