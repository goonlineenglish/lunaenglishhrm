# Phase 02: Auth & Layout Shell

## Context Links

- Parent plan: [plan.md](./plan.md)
- Dependencies: [Phase 01](./phase-01-project-setup-and-database.md) (DB schema, Supabase client)
- Research: [Tech Stack](./research/researcher-01-nextjs-supabase-stack.md)

## Overview

- **Date:** 2026-02-18
- **Priority:** P1
- **Status:** Pending
- **Effort:** 5h

Build login page with Luna branding, auth middleware for route protection, and the dashboard layout shell (sidebar + header). Implement role-based navigation and mobile responsive sidebar.

## Key Insights

- Use `@supabase/ssr` middleware pattern for session refresh on every request
- `cookies()` is async in Next.js 15 -- must `await` in server components
- Sidebar state can use `cookies` for persistence (no client state needed)
- shadcn/ui Sidebar component available (collapsible, mobile-ready)
- Role-based nav: filter menu items based on user role from DB, not just auth

## Requirements

### Functional
- Login page: email/password form, Luna branding, Vietnamese text
- Auth middleware: redirect unauthenticated to /login, redirect authenticated from /login to /pipeline
- Dashboard layout: collapsible sidebar + top header
- Sidebar navigation items based on user role
- Header: user name, role badge, notification bell (placeholder), logout button
- Mobile: hamburger menu triggers sidebar sheet overlay
- Luna brand theme applied globally

### Non-functional
- Login form validates email format + password length client-side
- Auth errors shown as Vietnamese toast messages
- Sidebar collapse state persisted in cookie
- Page transitions smooth (no flash of unauthenticated content)

## Architecture

```
Login Flow:
  /login → submit form → server action → supabase.auth.signInWithPassword()
         → success → redirect /pipeline
         → error → show toast (Vietnamese)

Middleware Flow:
  Request → middleware.ts → refresh session cookie
         → if no session + protected route → redirect /login
         → if session + /login → redirect /pipeline
         → else → continue

Layout Structure:
  (dashboard)/layout.tsx
  ├── Sidebar (server component: fetch user role, render nav items)
  │   ├── Logo
  │   ├── Nav items (filtered by role)
  │   └── User section (name, role, logout)
  ├── Header (client component: mobile menu toggle, notification bell)
  └── Main content area (children)
```

### Navigation Items by Role

| Route | Label | Admin | Advisor | Marketing |
|-------|-------|-------|---------|-----------|
| /pipeline | Pipeline | yes | yes | no |
| /reminders | Nhac nho | yes | yes | no |
| /students | Hoc sinh | yes | yes | no |
| /reports | Bao cao | yes | no | yes |
| /settings | Cai dat | yes | no | no |

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `app/(auth)/login/page.tsx` | Login page (server component wrapper) |
| `components/auth/login-form.tsx` | Login form (client component, form handling) |
| `lib/actions/auth-actions.ts` | Server actions: signIn, signOut |
| `middleware.ts` | Next.js middleware for auth session refresh + route protection |
| `app/(dashboard)/layout.tsx` | Dashboard layout with sidebar + header |
| `components/layout/sidebar.tsx` | Sidebar navigation (server component) |
| `components/layout/sidebar-nav-items.tsx` | Nav item list filtered by role (client for active state) |
| `components/layout/sidebar-mobile.tsx` | Mobile sidebar (Sheet overlay, client component) |
| `components/layout/header.tsx` | Top header bar (client component) |
| `components/layout/user-menu.tsx` | User dropdown: name, role, logout (client component) |
| `components/layout/notification-bell.tsx` | Notification bell placeholder (client component) |
| `lib/constants/navigation.ts` | Nav items config with role permissions |
| `app/(dashboard)/page.tsx` | Dashboard root redirect to /pipeline |

## Implementation Steps

1. **Create middleware.ts** at project root
   - Use `@supabase/ssr` `createServerClient` with request/response cookies
   - Refresh session on every request
   - Protected routes: everything under `/(dashboard)/`
   - Public routes: `/login`
   - Redirect logic: no session + protected → /login; session + /login → /pipeline

2. **Create login page** `app/(auth)/login/page.tsx`
   - Server component wrapper, check if already authenticated → redirect
   - Render `<LoginForm />` client component
   - Luna logo, purple gradient background, centered card

3. **Create LoginForm** `components/auth/login-form.tsx`
   - `'use client'` component
   - Email + password inputs (shadcn Input, Label)
   - Submit button with loading state
   - Call `signIn` server action
   - Error handling: show Vietnamese toast ("Sai email hoac mat khau")
   - Form validation: email required, password min 6 chars

4. **Create auth server actions** `lib/actions/auth-actions.ts`
   - `signIn(formData)`: call `supabase.auth.signInWithPassword()`, redirect on success
   - `signOut()`: call `supabase.auth.signOut()`, redirect to /login

5. **Create navigation config** `lib/constants/navigation.ts`
   - Array of `{ href, label, icon, roles[] }` objects
   - Vietnamese labels: "Pipeline", "Nhac nho", "Hoc sinh", "Bao cao", "Cai dat"
   - Icons from lucide-react

6. **Create dashboard layout** `app/(dashboard)/layout.tsx`
   - Server component: fetch current user + role from DB
   - Render Sidebar (desktop) + Header + main content
   - Pass user data to client components via props

7. **Create Sidebar** `components/layout/sidebar.tsx`
   - Server component receiving user role
   - Luna logo at top
   - Filter nav items by role
   - Render `<SidebarNavItems />` for active state highlighting
   - Collapse toggle (store in cookie)
   - User section at bottom: name, role badge, logout button

8. **Create SidebarNavItems** `components/layout/sidebar-nav-items.tsx`
   - `'use client'` for `usePathname()` active state
   - Highlight current route
   - Icon + label for each item

9. **Create mobile sidebar** `components/layout/sidebar-mobile.tsx`
   - `'use client'` with shadcn Sheet component
   - Triggered by hamburger button in header
   - Same nav items as desktop sidebar

10. **Create header** `components/layout/header.tsx`
    - Mobile: hamburger menu button (hidden on desktop)
    - Page title (dynamic based on route)
    - Right side: notification bell + user menu

11. **Create user menu** `components/layout/user-menu.tsx`
    - Dropdown: user name, role badge, "Dang xuat" button
    - Call `signOut` server action

12. **Create notification bell** `components/layout/notification-bell.tsx`
    - Placeholder: bell icon, will add unread count in Phase 04
    - `'use client'` for future Realtime subscription

13. **Create dashboard redirect** `app/(dashboard)/page.tsx`
    - Redirect to `/pipeline` (advisors) or `/reports` (marketing)

14. **Apply Luna brand theme** in `tailwind.config.ts`
    - CSS custom properties for brand colors
    - Font: Inter or system font stack
    - Border radius, shadows matching clean CRM aesthetic

## Todo List

- [ ] Create middleware.ts with auth session refresh
- [ ] Create login page with Luna branding
- [ ] Create LoginForm client component
- [ ] Create auth server actions (signIn, signOut)
- [ ] Create navigation config with role permissions
- [ ] Create dashboard layout (sidebar + header + main)
- [ ] Create Sidebar server component
- [ ] Create SidebarNavItems client component
- [ ] Create mobile sidebar (Sheet overlay)
- [ ] Create header component
- [ ] Create user menu dropdown
- [ ] Create notification bell placeholder
- [ ] Create dashboard root redirect page
- [ ] Apply Luna brand colors to Tailwind config
- [ ] Test login flow end-to-end
- [ ] Test role-based navigation filtering
- [ ] Test mobile responsive sidebar

## Success Criteria

- Login works with email/password, shows Vietnamese error messages
- Unauthenticated users always redirected to /login
- Authenticated users see correct nav items for their role
- Sidebar collapses/expands on desktop, shows as sheet on mobile
- No flash of unauthenticated content (middleware handles redirect)
- Luna brand colors applied consistently

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Session refresh race condition | Users logged out unexpectedly | Follow Supabase SSR middleware pattern exactly |
| Layout shift on sidebar collapse | Janky UX | Use CSS transitions, persist state in cookie |
| Role not found in DB | Blank sidebar | Default to most restrictive role (marketing), show error |

## Security Considerations

- Auth middleware runs on EVERY request (no bypass possible)
- `getUser()` used for server-side auth checks (not `getSession()`)
- Login form uses server action (credentials never in client URL)
- Session cookie HTTP-only, secure, same-site
- Failed login attempts don't reveal whether email exists

## Next Steps

- Phase 3 needs: authenticated layout, user context, middleware working
- Notification bell component will be enhanced in Phase 4
- Settings page (admin only) will be built in Phase 7 for integration config
