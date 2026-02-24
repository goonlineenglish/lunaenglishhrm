# Phase 2: Create Docker Setup

## Context Links
- [Phase 1 - Standalone Config](phase-01-configure-nextjs-standalone.md)
- [package.json](../../package.json)
- [.gitignore](../../.gitignore)

## Overview
- **Priority**: P1
- **Status**: pending
- **Description**: Create multi-stage Dockerfile, docker-compose.yml with Caddy reverse proxy, .dockerignore, Caddyfile, and env template. Optimized for i3-4005U / 8GB RAM.

## Key Insights
- Multi-stage build: deps stage, build stage, run stage -- final image ~150MB
- Alpine-based Node 20 image (smallest LTS with Next.js 16 support)
- Caddy auto-provisions Let's Encrypt certs with zero config
- Docker memory limits prevent OOM: 512MB for app, 64MB for Caddy
- Node.js `--max-old-space-size=384` keeps V8 heap within container limit
- `HOSTNAME=0.0.0.0` required for standalone server to accept external connections

## Requirements
### Functional
- `docker compose up -d` starts both app and Caddy
- HTTPS works automatically via Let's Encrypt
- App accessible at `https://yourdomain.com`
- Container auto-restarts on crash or reboot

### Non-functional
- Final Docker image < 200MB
- App container memory < 512MB at runtime
- Caddy container memory < 64MB
- Build time < 5 minutes on i3-4005U (using cached layers)

## Architecture

```
docker-compose.yml
├── luna-crm (Next.js standalone)
│   ├── Port 3000 (internal only)
│   ├── Memory limit: 512MB
│   ├── .env.production mounted
│   └── Auto-restart: unless-stopped
└── caddy (reverse proxy)
    ├── Ports 80, 443 (public)
    ├── Memory limit: 64MB
    ├── Caddyfile mounted
    ├── caddy_data volume (certs on HDD)
    └── Auto-restart: unless-stopped
```

## Related Code Files
### Files to Create
- `Dockerfile`
- `docker-compose.yml`
- `Caddyfile`
- `.dockerignore`
- `.env.production.template`

### Files to Modify
- `.gitignore` -- add `.env.production`, `caddy_data/`, `caddy_config/`

## Implementation Steps

### 1. Create `.dockerignore`

```dockerignore
.git
.next
node_modules
.env*
*.md
docs/
plans/
tests/
supabase/
.claude/
.opencode/
NUL
```

### 2. Create `Dockerfile`

```dockerfile
# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Stage 2: Build application ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build standalone output
RUN npm run build

# ---- Stage 3: Production runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone server
COPY --from=builder /app/.next/standalone ./
# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

# Limit V8 heap to stay within 512MB container limit
CMD ["node", "--max-old-space-size=384", "server.js"]
```

### 3. Create `docker-compose.yml`

```yaml
services:
  luna-crm:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: luna-crm
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    env_file:
      - .env.production
    deploy:
      resources:
        limits:
          memory: 512M
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/login"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

  caddy:
    image: caddy:2-alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    deploy:
      resources:
        limits:
          memory: 64M
    depends_on:
      luna-crm:
        condition: service_healthy

volumes:
  caddy_data:
    driver: local
  caddy_config:
    driver: local
```

**Note on volumes**: By default Docker stores volumes at `/var/lib/docker/volumes/`. If HDD is mounted at e.g. `/mnt/hdd`, you can symlink or configure Docker daemon `data-root` to `/mnt/hdd/docker`. This moves all Docker data (images, volumes, build cache) to the HDD, preserving SSD space.

### 4. Create `Caddyfile`

Replace `your-domain.com` with actual domain.

```caddyfile
your-domain.com {
    reverse_proxy luna-crm:3000

    # Compress responses
    encode gzip zstd

    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    }

    # Logging
    log {
        output file /data/access.log {
            roll_size 10mb
            roll_keep 3
        }
    }
}
```

### 5. Create `.env.production.template`

```bash
# === Supabase (REQUIRED) ===
NEXT_PUBLIC_SUPABASE_URL=https://vgxpucmwivhlgvlzzkju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# === Cron Auth (REQUIRED) ===
CRON_SECRET=generate-random-32-char-string-here

# === Email (optional) ===
RESEND_API_KEY=
EMAIL_FROM=noreply@luna.edu.vn

# === Zalo Integration (optional) ===
ZALO_OA_TOKEN=
ZALO_OA_SECRET=

# === Facebook Integration (optional) ===
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_ACCESS_TOKEN=
FACEBOOK_VERIFY_TOKEN=
```

### 6. Update `.gitignore`

Add these entries:
```
# Docker / deployment
.env.production
caddy_data/
caddy_config/
```

## Todo List
- [ ] Create `.dockerignore`
- [ ] Create `Dockerfile` (multi-stage, Alpine, standalone)
- [ ] Create `docker-compose.yml` (app + Caddy, memory limits)
- [ ] Create `Caddyfile` (reverse proxy, auto SSL, security headers)
- [ ] Create `.env.production.template`
- [ ] Update `.gitignore` with Docker entries
- [ ] Test Docker build locally: `docker compose build`
- [ ] Verify image size < 200MB: `docker images luna-crm`

## Success Criteria
- `docker compose build` completes without errors
- Final image size < 200MB
- `docker compose up -d` starts both services
- App responds on port 3000 internally
- Caddy provisions SSL and proxies to app

## Risk Assessment
| Risk | Mitigation |
|------|-----------|
| Build OOM on 8GB RAM | `node --max-old-space-size=1536` during build only (Docker build stage has no memory limit by default) |
| SSD space exhaustion | Docker build cache on HDD, prune after build: `docker builder prune` |
| Slow first build (~10min) | Subsequent builds use cached layers (deps change rarely) |
| Alpine compatibility | Node 20 Alpine is officially supported; no native modules in deps |

## Security Considerations
- App runs as non-root user `nextjs` (UID 1001) inside container
- `.env.production` never committed to git
- Only ports 80/443 exposed publicly; port 3000 bound to 127.0.0.1
- Caddy adds security headers (HSTS, X-Frame-Options, etc.)
- Docker healthcheck ensures auto-recovery

## Next Steps
- Phase 3: cron setup (can run in parallel with Phase 2)
- Phase 4: deploy on homeserver (depends on Phase 1-3)
