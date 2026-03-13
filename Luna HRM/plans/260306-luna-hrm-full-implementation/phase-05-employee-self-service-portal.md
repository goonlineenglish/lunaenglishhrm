# Phase 5: Employee Self-Service Portal (PWA)

## Context Links

- [UI Mockups](../visuals/hrm-ui-mockups-attendance-payroll.md) — Screens 3, 7, 8 (mobile employee views)
- [Design Guidelines](../../docs/design-guidelines.md) — Mobile layout, responsive patterns
- [Code Standards](../../docs/code-standards.md) — PWA assets, manifest.json

## Overview

- **Priority:** P1 (Nice to have — adds mobile access)
- **Status:** Pending
- **Effort:** 1-2 days
- **Description:** PWA setup (manifest + service worker), employee attendance view (monthly calendar), payslip list + detail, profile page, bottom tab navigation, mobile-optimized layout, dark mode support.

## Key Insights

- PWA = Progressive Web App. No app store needed — installed from browser. Works on old phones.
- Employee role = read-only. No mutations from mobile portal (attendance/payslip are view-only).
- **[ISSUE-9 fix] Layout strategy:** Use CSS-responsive navigation (Tailwind `hidden md:block` / `md:hidden`) instead of `useMediaQuery` hook. Server-rendered shell stays hydration-safe. Sidebar visible on desktop, bottom nav visible on mobile — both rendered in SSR, CSS handles visibility.
- Dark mode via Tailwind `dark:` classes + system preference detection
- **[ISSUE-9 fix] Caching:** Service worker caches ONLY static assets (JS, CSS, icons) and offline fallback page. NO API responses cached (salary data is sensitive). Stale-while-revalidate for static assets only.
- Employee views are a subset of dashboard routes — no separate route group needed. Just mobile-optimized pages.

## Requirements

### Functional
1. **PWA manifest** — manifest.json with app name, icons, theme color, display: standalone
2. **Service worker** — Cache static assets, enable offline shell
3. **Monthly attendance calendar** — Color-coded day cells (green=present, red=KP, etc.)
4. **Weekly attendance detail** — Expand week to see class-by-class breakdown
5. **Payslip list** — Scrollable list of months, showing NET amount per month
6. **Payslip detail** — Full breakdown (same data as desktop payslip-detail-panel)
7. **Profile page** — Employee basic info (read-only)
8. **Bottom tab navigation** — Fixed bottom: Trang chu | Cham cong | Phieu luong | Ho so
9. **Dark mode** — Toggle or auto-detect system preference

### Non-Functional
- Installable on Android/iOS from browser
- Works on 320px width (no horizontal scroll)
- Loads offline (cached shell + last data)
- Large touch targets (48px minimum)

## Architecture

### PWA Architecture
```
manifest.json (public/)
    ├── name: "Luna HRM"
    ├── short_name: "HRM"
    ├── start_url: "/dashboard"
    ├── display: "standalone"
    ├── theme_color: "#3E1A51"
    ├── background_color: "#ffffff"
    └── icons: [192x192, 512x512]

Service Worker (public/sw.js)
    ├── Cache static assets (JS, CSS, fonts)
    ├── Cache API responses (stale-while-revalidate)
    └── Offline fallback page

Employee Routes (reuse dashboard):
    app/(dashboard)/page.tsx          → Employee home (stats)
    app/(dashboard)/attendance/page.tsx → Monthly view (employee variant)
    app/(dashboard)/payroll/page.tsx   → Payslip list (employee variant)
    app/(dashboard)/employees/[id]/page.tsx → Own profile
```

### Mobile vs Desktop Detection
```
[ISSUE-9 fix] Use CSS-responsive approach (NOT useMediaQuery):

Dashboard layout.tsx (server component):
  - Renders BOTH sidebar AND bottom-nav
  - Sidebar: className="hidden md:flex ..." (CSS hides on mobile)
  - Bottom nav: className="md:hidden ..." (CSS hides on desktop)
  - Bottom nav only rendered for employee role (server-side role check)
  - No client-side viewport detection needed
  - Zero hydration flicker

Role-based content filtering already in place from Phase 1.
```

## Related Code Files

### Files to Create

**PWA Assets:**
- `public/manifest.json` — PWA manifest
- `public/sw.js` — Service worker (cache strategy)
- `public/icons/icon-192x192.png` — PWA icon (small)
- `public/icons/icon-512x512.png` — PWA icon (large)

**Components:**
- `components/shared/bottom-nav.tsx` — Mobile bottom tab navigation
- `components/shared/pwa-install-prompt.tsx` — "Add to Home Screen" prompt
- `components/attendance/employee-attendance-calendar.tsx` — Monthly color-coded calendar
- `components/attendance/employee-attendance-week-detail.tsx` — Expandable week breakdown
- `components/payroll/employee-payslip-list.tsx` — Scrollable payslip list
- `components/payroll/employee-payslip-detail.tsx` — Full payslip breakdown (mobile)
- `components/employees/employee-profile-view.tsx` — Read-only profile card

**Layout Update:**
- Update `app/(dashboard)/layout.tsx` — Detect mobile + employee role → show bottom nav

**Hooks:**
- `lib/hooks/use-pwa.ts` — PWA install state, offline detection

## Implementation Steps

### Step 1: PWA Setup
1. Create `public/manifest.json`:
   ```json
   {
     "name": "Luna HRM",
     "short_name": "HRM",
     "start_url": "/",
     "display": "standalone",
     "theme_color": "#3E1A51",
     "background_color": "#ffffff",
     "icons": [
       { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
     ]
   }
   ```
2. Add manifest link to `app/layout.tsx`: `<link rel="manifest" href="/manifest.json">`
3. Add meta tags: `<meta name="theme-color" content="#3E1A51">`
4. Create `public/sw.js` — cache-first strategy for static assets ONLY. **Do NOT cache API responses** (salary data is sensitive). Offline fallback page for disconnected state.
5. Register service worker in root layout (client script)
6. Generate PWA icons (192x192, 512x512) — Luna purple background with "H" or "HRM" text

### Step 2: Bottom Tab Navigation (CSS-Responsive)
1. Create `components/shared/bottom-nav.tsx`:
   - Fixed bottom bar: 4 tabs with icons
   - Trang chu (Home icon) → /dashboard
   - Cham cong (Calendar icon) → /attendance (employee view)
   - Phieu luong (Banknote icon) → /payroll (employee view)
   - Ho so (User icon) → /employees/[ownId]
   - Active tab highlighted with primary color
   - **className="md:hidden ..."** — hidden on desktop via CSS, no JS detection
2. Update `app/(dashboard)/layout.tsx`:
   - Server-side role check: if role=employee, include bottom-nav component
   - Sidebar: `className="hidden md:flex ..."` — CSS hides on mobile
   - Bottom nav: `className="md:hidden ..."` — CSS hides on desktop
   - Add padding-bottom for mobile content area
   - **No `useMediaQuery` needed** — CSS responsive only

### Step 3: Employee Attendance Calendar
1. Create `components/attendance/employee-attendance-calendar.tsx`:
   - Monthly grid: 7 columns (Mon-Sun), 4-5 rows (weeks)
   - Each day cell colored by attendance status
   - Green dot (present), Red dot (KP), Blue dot (absent w/ permission), Yellow dot (half)
   - Gray for days not in month or no schedule
   - Month selector at top (< month/year >)
   - Bottom summary: "Tong: 16 buoi | Vang: 1 | KP: 0"
2. Server action: fetch attendance for employee's own records (uses RLS — employee sees own only)
3. Handle two-track: if office staff → query office_attendance; if teacher/assistant → query attendance

### Step 4: Employee Attendance Week Detail
1. Create `components/attendance/employee-attendance-week-detail.tsx`:
   - Click week in calendar → expand to show class-by-class breakdown
   - For teachers/assistants: show each class, day, status
   - For office staff: show each day with status
   - Read-only (no editing)

### Step 5: Employee Payslip List
1. Create `components/payroll/employee-payslip-list.tsx`:
   - Vertical list of payslips (most recent first)
   - Card per month: "T3/2026 — 1,730,000 VND" with status badge
   - Status: "Xac nhan" (confirmed) in green, "Nhap" (draft) in gray
   - Click → navigate to detail
2. Server action: fetch payslips for own employee_id (RLS)

### Step 6: Employee Payslip Detail
1. Create `components/payroll/employee-payslip-detail.tsx`:
   - Full mobile-optimized breakdown
   - Sections: Header (name, position, period), Thu nhap (income), Khau tru (deductions), Thuc lanh (NET)
   - KPI breakdown (if assistant)
   - Using shadcn Card + Separator components

### Step 7: Employee Profile View
1. Create `components/employees/employee-profile-view.tsx`:
   - Card layout: avatar placeholder, name, position, branch
   - Info sections: personal, employment, bank
   - Read-only (employee cannot edit own profile)
   - Evaluations tab (linked from Phase 6)

### Step 8: Dark Mode
1. Add dark mode toggle in navbar user dropdown
2. Use Tailwind `dark:` classes throughout components
3. Persist preference in localStorage
4. Auto-detect system preference: `prefers-color-scheme: dark`
5. Update `app/globals.css` with dark theme variables

### Step 9: PWA Install Prompt
1. Create `components/shared/pwa-install-prompt.tsx`:
   - Detect `beforeinstallprompt` event
   - Show banner: "Them Luna HRM vao man hinh chinh?" with install button
   - Dismiss option
2. Create `lib/hooks/use-pwa.ts`:
   - Track install state, offline state
   - Show offline indicator when disconnected

### Step 10: Verify & Build
1. Test on mobile browser (320px viewport)
2. Test PWA install on Android Chrome
3. Test dark mode toggle
4. Test offline access (cached pages load)
5. Run `npm run build`

## Todo List

- [ ] Create PWA manifest.json + icons
- [ ] Create service worker with cache strategy
- [ ] Register service worker in root layout
- [ ] Build bottom tab navigation (employee mobile)
- [ ] Update dashboard layout for employee + mobile detection
- [ ] Build monthly attendance calendar (color-coded)
- [ ] Build week detail expandable view
- [ ] Build payslip list (mobile card layout)
- [ ] Build payslip detail (full mobile breakdown)
- [ ] Build employee profile view (read-only)
- [ ] Implement dark mode (toggle + system detection)
- [ ] Build PWA install prompt
- [ ] Test on 320px mobile viewport
- [ ] Test PWA install on Android
- [ ] `npm run build` passes

## Success Criteria

- PWA installable from Chrome on Android
- Works on 320px width without horizontal scroll
- Bottom nav shows for employee role on mobile
- Attendance calendar renders correct colors for each status
- Payslip list shows all months with correct NET amounts
- Payslip detail matches desktop version data
- Dark mode toggles correctly
- Offline: cached pages load when disconnected

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| PWA not installable on iOS Safari | Low | iOS supports PWA but limited; test on both platforms |
| Service worker caching stale data | Medium | Use stale-while-revalidate strategy, add refresh mechanism |
| Bottom nav overlapping content | Low | Add padding-bottom to main content area |

## Security Considerations

- Employee sees own data only (enforced by RLS, not just UI)
- No mutation endpoints exposed to employee role
- PWA caches ONLY static assets (JS, CSS, icons, offline fallback) — NO API data cached
- Service worker explicitly excludes /api/* routes from cache

## Next Steps

- Phase 6: Employee profile view includes evaluation history tab
- Phase 7: Keyboard shortcuts (desktop only, not relevant for mobile)
