---
title: "Homeserver Deployment for Luna English CRM"
description: "Deploy Next.js CRM to resource-constrained Dell laptop homeserver via Docker + Caddy + cron"
status: pending
priority: P1
effort: 3h
branch: main
tags: [deployment, docker, caddy, homeserver, self-hosted]
created: 2026-02-24
---

# Homeserver Deployment Plan

## Target Environment
- **Hardware**: Dell Inspiron 3442 -- i3-4005U (1.70GHz 2C/4T), 8GB DDR3L, 120GB SSD + 460GB HDD
- **OS**: Ubuntu with Docker + Docker Compose pre-installed
- **Network**: Custom domain, needs HTTPS
- **Database**: Supabase Cloud (Singapore) -- NOT self-hosted, stays remote

## Architecture

```
Internet --> Domain (HTTPS) --> Caddy (reverse proxy, auto SSL)
                                  |
                                  v
                          Docker: luna-crm (Next.js standalone, port 3000)
                                  |
                                  v
                          Supabase Cloud (Singapore)

Host crontab --> curl localhost:3000/api/cron/* (4 jobs)
```

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Configure Next.js standalone output](phase-01-configure-nextjs-standalone.md) | **DONE** (already in next.config.ts) | 0 |
| 2 | [Create Docker setup](phase-02-create-docker-setup.md) | pending | 1h |
| 3 | [Create cron setup](phase-03-create-cron-setup.md) | pending | 30min |
| 4 | [Deploy and verify](phase-04-deploy-and-verify.md) | pending | 1h15min |

## Key Decisions
1. **Caddy** over Nginx -- auto HTTPS, ~30MB RAM, zero-config SSL renewal
2. **Standalone output** -- ~15MB server vs ~500MB node_modules
3. **Host crontab** -- no extra container, simple curl calls
4. **Alpine images** -- minimal Docker footprint
5. **SSD for app, HDD for logs** -- optimize limited SSD space
6. **Docker `mem_limit`** — use top-level `mem_limit` (not `deploy.resources.limits` which is Swarm-only)

## Dependencies
- Domain DNS A record pointing to homeserver public IP
- Ports 80/443 open on router (forwarded to homeserver)
- Supabase credentials (already exist in .env.local)

## Files to Create/Modify
- `next.config.ts` -- add `output: 'standalone'`
- `Dockerfile` -- multi-stage Alpine build
- `docker-compose.yml` -- app + Caddy services
- `Caddyfile` -- reverse proxy + auto HTTPS
- `.dockerignore` -- exclude unnecessary files
- `.env.production.template` -- env var reference (no secrets)
- `docs/deployment-guide.md` -- updated with homeserver instructions
