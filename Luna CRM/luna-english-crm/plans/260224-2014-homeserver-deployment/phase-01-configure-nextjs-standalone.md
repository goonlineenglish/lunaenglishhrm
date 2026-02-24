# Phase 1: Configure Next.js Standalone Output

## Context Links
- [next.config.ts](../../next.config.ts)
- [Next.js Standalone Docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)

## Overview
- **Priority**: P1 (blocker for all other phases)
- **Status**: pending
- **Description**: Enable `output: 'standalone'` in Next.js config to produce a self-contained server binary (~15MB) instead of requiring full node_modules (~500MB). Critical for 120GB SSD constraint.

## Key Insights
- Standalone output copies only necessary node_modules files into `.next/standalone/`
- Produces a `server.js` that runs with plain `node server.js`
- Static assets (`public/` and `.next/static/`) must be copied separately into the standalone dir
- The Dockerfile handles this copy step during build

## Requirements
### Functional
- `npm run build` produces `.next/standalone/server.js`
- Server starts with `node .next/standalone/server.js`
- All routes (pages, API, webhooks, cron) work identically

### Non-functional
- Build output < 50MB (standalone + static)
- No breaking changes to dev workflow (`npm run dev` unaffected)

## Related Code Files
### Files to Modify
- `next.config.ts` -- add `output: 'standalone'`

### Files to Create
- None

## Implementation Steps

1. Update `next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

2. Verify build works locally:
```bash
npm run build
```

3. Verify standalone output exists:
```bash
ls -la .next/standalone/server.js
```

4. Test standalone server:
```bash
# Copy static files (Dockerfile does this automatically, but for local test)
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
node .next/standalone/server.js
```

## Todo List
- [ ] Update `next.config.ts` with `output: 'standalone'`
- [ ] Run `npm run build` and verify `.next/standalone/` exists
- [ ] Verify no regressions in dev mode

## Success Criteria
- `npm run build` completes without errors
- `.next/standalone/server.js` exists
- `node .next/standalone/server.js` serves the app on port 3000
- `npm run dev` still works normally

## Risk Assessment
- **Low risk**: `output: 'standalone'` is stable Next.js feature since v12
- If middleware breaks in standalone mode, verify `middleware.ts` is included in output

## Next Steps
- Phase 2 depends on this -- Dockerfile uses standalone output
