# LUNA HRM - FINAL DEPLOYMENT REPORT
**Date:** 2026-03-17

## 1. Deployment Summary
- **App Name:** Luna HRM (Lightweight HRM for English Language Centers)
- **Domain:** `https://hrm.lunaenglish.io.vn`
- **Server:** Ubuntu (cuongpham)
- **Status:** ✅ SUCCESSFUL DEPLOYMENT

## 2. Infrastructure Setup
- **Source Code:** Uploaded successfully from local Windows machine.
- **Environment:** Node.js 18+ environment configured with Supabase connection strings via `.env.local`.
- **Process Manager (PM2):**
  - App is running on Port `3002` under the PM2 handle `luna-hrm` (ID 3).
  - Configured to auto-restart on crashes.
- **DNS & Proxy:**
  - Integrated via **Cloudflare Tunnel** (`cloudflared`).
  - Running permanently in the background, handling HTTPS and routing traffic for `hrm.lunaenglish.io.vn` directly to Port `3002`.

## 3. Server Health & Overload Check 
*(Recorded immediately after deployment)*

**=> Result: The server is VERY HEALTHY, completely under-loaded.**

- **CPU Usage:** 
  - `97.7% IDLE` 
  - The server currently has almost no CPU load (Load Average: 0.05).
- **Memory (RAM) Usage:** 
  - Total: `7.7 GiB`
  - Used: `1.7 GiB` 
  - **Available:** `6.0 GiB` (Plenty of free RAM for future apps).
- **Disk Usage:**
  - Total: `107 GB`
  - Used: `42 GB`
  - **Available:** `60 GB` (Used only 41%).

## 4. Apps Currently Running Continuously
According to the `pm2 list` and background processes, there are currently 2 main Node.js apps and 1 routing service running continuously:
1. **`my-app` (crm.lunaenglish.io.vn)** - PM2 ID 0 - RAM: ~75MB
2. **`luna-hrm` (hrm.lunaenglish.io.vn)** - PM2 ID 3 - RAM: ~66MB
3. **`cloudflared` (Cloudflare Tunnel)** - Running in background, lightweight overhead.

## 5. Maintenance Notes
- Should `luna-hrm` crash, PM2 will automatically bring it back up.
- To view live logs of the app: `pm2 logs luna-hrm`
- To view DNS tunnel logs: `cat ~/.cloudflared/tunnel.log`
