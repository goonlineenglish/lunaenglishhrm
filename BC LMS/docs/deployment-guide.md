# Deployment Guide

**Last Updated**: 2026-03-04

## Overview

Buttercup LMS deploys on a single VPS using Docker Compose with Caddy as reverse proxy. This guide covers environment setup, database initialization, and production deployment.

**Target Infrastructure**: 2-4 CPU, 4GB RAM, 50GB SSD, Ubuntu 20.04+

## Prerequisites

### System Requirements
- Docker 20.10+
- Docker Compose 1.29+
- PostgreSQL 15+ (can run in Docker)
- 2GB+ free disk space

### Install Docker & Docker Compose

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo usermod -aG docker $USER
```

**macOS** (development only):
```bash
brew install docker docker-compose
# Or install Docker Desktop
```

**Verify Installation**:
```bash
docker --version
docker-compose --version
```

## Environment Configuration

### Development Setup

Create `.env.local` in project root:
```bash
# Database
DATABASE_URL=postgresql://bc_lms_user:bc_lms_password@localhost:5432/bc_lms

# JWT
JWT_SECRET=$(openssl rand -base64 32)

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Production Setup

Create `.env.production` (DO NOT commit to git):
```bash
# Database
DATABASE_URL=postgresql://bc_lms_user:secure_password_here@postgres:5432/bc_lms

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-random-secret-min-32-chars
CRON_SECRET=your-random-cron-secret-min-32-chars

# App
NEXT_PUBLIC_APP_URL=https://lms.buttercuplearning.com
NODE_ENV=production
LOG_LEVEL=info

# Caddy
CADDY_DOMAIN=lms.buttercuplearning.com
CADDY_EMAIL=admin@buttercuplearning.com

# Cloudflare R2 (File Storage)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=your-bucket-name

# Optional: External Services (Phase 2+)
GOOGLE_DRIVE_API_KEY=
BUNNY_STREAM_API_KEY=
```

**Security**: Store `.env.production` securely; never commit to git. Use secrets manager on VPS.

## Docker Compose Setup

### Development Compose File (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: bc-lms-postgres
    environment:
      POSTGRES_USER: bc_lms_user
      POSTGRES_PASSWORD: bc_lms_password
      POSTGRES_DB: bc_lms
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bc_lms_user -d bc_lms"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bc-lms-app
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://bc_lms_user:bc_lms_password@postgres:5432/bc_lms
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

volumes:
  postgres_data:
```

### Production Compose File (`docker-compose.production.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: bc-lms-postgres-prod
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: bc_lms
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d bc_lms"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - bc-lms-network

  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: bc-lms-app-prod
    restart: always
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/bc_lms
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
      NEXT_PUBLIC_APP_URL: https://${CADDY_DOMAIN}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - bc-lms-network

  caddy:
    image: caddy:2.7-alpine
    container_name: bc-lms-caddy
    restart: always
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    environment:
      CADDY_DOMAIN: ${CADDY_DOMAIN}
    depends_on:
      - app
    networks:
      - bc-lms-network

volumes:
  postgres_prod_data:
  caddy_data:
  caddy_config:

networks:
  bc-lms-network:
    driver: bridge
```

## Dockerfile

```dockerfile
# Multi-stage build for optimal image size

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY . .
RUN npm ci
RUN npx prisma generate
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Create healthcheck endpoint
COPY --from=builder /app/next.config.ts ./

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# Development stage (for local development)
FROM node:20-alpine AS development
WORKDIR /app
RUN npm install -g pm2
COPY . .
RUN npm install
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

## Caddy Reverse Proxy Configuration

Create `Caddyfile` in project root:

```caddy
{
  email {$CADDY_EMAIL}
  admin off
}

{$CADDY_DOMAIN} {
  # Reverse proxy to Next.js app
  reverse_proxy app:3000

  # Security headers
  header X-Frame-Options SAMEORIGIN
  header X-Content-Type-Options nosniff
  header X-XSS-Protection "1; mode=block"
  header Referrer-Policy strict-origin-when-cross-origin
  header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: https://*.r2.cloudflarestorage.com; media-src 'self' https://drive.google.com https://*.b-cdn.net; frame-src 'self' https://drive.google.com"

  # Compression
  encode gzip

  # Cache static assets
  @static {
    path /_next/static/*
    path /public/*
  }
  header @static Cache-Control "public, max-age=31536000, immutable"

  # Cache-bust routes
  @api {
    path /api/*
  }
  header @api Cache-Control "no-cache, no-store, must-revalidate"

  # HTTPS redirect (automatic with Caddy)
  # TLS certificates automatically generated and renewed
}
```

For local development, create `Caddyfile.local`:
```caddy
localhost {
  reverse_proxy localhost:3000
  encode gzip
}
```

## Database Setup

### Initialize Database (First Run)

```bash
# Create .env.local with DATABASE_URL

# Run migrations
npx prisma migrate dev --name init

# Seed initial data (optional)
npx prisma db seed
```

### Seed Script (`prisma/seed.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@buttercuplearning.com',
      password: await bcrypt.hash('changeme123', 12),
      name: 'Administrator',
      role: 'ADMIN',
      school: 'Buttercup Learning'
    }
  });

  console.log(`Created admin user: ${admin.email}`);

  // Create programs
  const buttercup = await prisma.program.create({
    data: {
      name: 'Buttercup Program',
      slug: 'buttercup',
      description: 'Teacher training for Buttercup English program',
      lessonPlanTemplate: '{"type":"doc","content":[]}'
    }
  });

  console.log(`Created program: ${buttercup.name}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

Run seed:
```bash
npx prisma db seed
```

### Backup Database

```bash
# Backup to file
pg_dump -U bc_lms_user -d bc_lms -h localhost > backup.sql

# Restore from file
psql -U bc_lms_user -d bc_lms -h localhost < backup.sql

# Docker container backup
docker exec bc-lms-postgres pg_dump -U bc_lms_user bc_lms > backup.sql
```

## Session Cleanup Cron Job

### Schedule Expired Session Deletion

**Option 1: System Cron (Linux)**

```bash
# Edit crontab
crontab -e

# Add job (runs daily at 3 AM)
0 3 * * * psql -h localhost -U bc_lms_user -d bc_lms -c "DELETE FROM sessions WHERE \"expiresAt\" < NOW();"
```

**Option 2: Docker Container Cron**

```dockerfile
FROM node:20-alpine
# Install crond
RUN apk add --no-cache postgresql-client

# Copy cron entry
COPY crontab /etc/crontabs/root

# Start crond
CMD ["crond", "-f"]
```

Create `crontab` file:
```
0 3 * * * psql -h postgres -U bc_lms_user -d bc_lms -c "DELETE FROM sessions WHERE \"expiresAt\" < NOW();" >> /var/log/cron.log 2>&1
```

**Option 3: Node.js Scheduler (app-based)**

```typescript
// lib/cron/session-cleanup.ts
import { prisma } from '@/lib/prisma';

export async function cleanupExpiredSessions() {
  const deleted = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });

  console.log(`Deleted ${deleted.count} expired sessions`);
}

// Schedule in server.ts or API route
import cron from 'node-cron';
cron.schedule('0 3 * * *', () => cleanupExpiredSessions());
```

## Health Checks

### Application Health Endpoint

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected'
      },
      { status: 503 }
    );
  }
}
```

Monitor with:
```bash
curl http://localhost:3000/api/health
```

## Production Deployment Steps

### 1. Prepare VPS

```bash
# SSH to VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Docker
apt install -y docker.io docker-compose curl

# Create app directory
mkdir -p /opt/bc-lms
cd /opt/bc-lms
```

### 2. Deploy Code

```bash
# Clone repository
git clone <repo-url> .

# Copy production environment
scp .env.production root@your-vps-ip:/opt/bc-lms/

# Set permissions
chmod 600 .env.production
```

### 3. Build & Start Containers

```bash
# Build images
docker-compose -f docker-compose.production.yml build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose -f docker-compose.production.yml exec app npx prisma migrate deploy

# Seed data (first run only)
docker-compose -f docker-compose.production.yml exec app npx prisma db seed
```

### 5. Verify Deployment

```bash
# Check health endpoint
curl https://lms.buttercuplearning.com/api/health

# Check Caddy status
docker-compose -f docker-compose.production.yml exec caddy caddy version

# Monitor logs
docker-compose -f docker-compose.production.yml logs -f app
```

## Maintenance & Updates

### Update Application Code

```bash
cd /opt/bc-lms

# Pull latest
git pull origin main

# Rebuild
docker-compose -f docker-compose.production.yml build

# Restart
docker-compose -f docker-compose.production.yml restart app

# Check logs
docker-compose -f docker-compose.production.yml logs -f app
```

### Update Database Schema

```bash
# Backup first
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U bc_lms_user bc_lms > backup-$(date +%Y%m%d).sql

# Apply migrations
docker-compose -f docker-compose.production.yml exec app \
  npx prisma migrate deploy
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs

# Specific service
docker-compose -f docker-compose.production.yml logs -f app
docker-compose -f docker-compose.production.yml logs -f postgres
docker-compose -f docker-compose.production.yml logs -f caddy

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100
```

## Troubleshooting

### Database Connection Error

```bash
# Check if postgres is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify DATABASE_URL in .env
cat .env.production | grep DATABASE_URL

# Test connection
docker-compose exec postgres psql -U bc_lms_user -d bc_lms -c "SELECT 1"
```

### App Won't Start

```bash
# Check logs
docker-compose logs app

# Verify environment variables
docker-compose exec app env | grep -E "^(JWT|DATABASE|NODE)"

# Check Prisma setup
docker-compose exec app npx prisma validate

# Rebuild from scratch
docker-compose down
docker volume rm bc-lms_postgres_data  # WARNING: Deletes database
docker-compose up --build
```

### Caddy HTTPS Issues

```bash
# Check Caddy logs
docker-compose logs caddy

# Verify domain points to VPS
nslookup lms.buttercuplearning.com

# Force Caddy reload
docker-compose exec caddy caddy reload
```

## Environment Variables Reference

| Variable | Example | Required | Usage |
|----------|---------|----------|-------|
| DATABASE_URL | postgresql://user:pass@host:5432/bc_lms | Yes | Database connection |
| JWT_SECRET | (32+ chars) | Yes | Sign JWT tokens |
| NODE_ENV | production | Yes | Optimization level |
| NEXT_PUBLIC_APP_URL | https://lms.buttercuplearning.com | Yes | App base URL |
| LOG_LEVEL | info | No | Logging verbosity |
| GOOGLE_DRIVE_API_KEY | (Phase 2+) | No | Google Drive video embed |
| BUNNY_STREAM_API_KEY | (Phase 4) | No | Bunny.net video platform |
| R2_ACCOUNT_ID | your-account-id | Yes (R2) | Cloudflare R2 account |
| R2_ACCESS_KEY_ID | (generated) | Yes (R2) | R2 API access key |
| R2_SECRET_ACCESS_KEY | (generated) | Yes (R2) | R2 API secret key |
| R2_BUCKET_NAME | your-bucket-name | Yes (R2) | R2 bucket for materials |
| CADDY_DOMAIN | lms.buttercuplearning.com | Yes (prod) | HTTPS domain |
| CADDY_EMAIL | admin@example.com | Yes (prod) | Let's Encrypt email |
