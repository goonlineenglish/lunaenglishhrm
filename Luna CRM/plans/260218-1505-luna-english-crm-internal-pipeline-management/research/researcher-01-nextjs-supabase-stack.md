# Next.js 15 + Supabase + shadcn/ui CRM Stack Research

**Date:** 2026-02-18
**Scope:** Best practices for CRM dashboard with 3-5 users, 20-50 leads/month, ~95 students

---

## 1. Next.js 15 App Router Patterns

### Folder Structure (Recommended)
```
app/
├── (auth)/              # Route group for login/signup
│   ├── login/
│   └── signup/
├── (dashboard)/         # Route group with shared layout
│   ├── layout.tsx       # Sidebar + header shell
│   ├── pipeline/        # Kanban view
│   ├── students/        # Student list
│   ├── @modal/          # Parallel route for modals
│   └── @sidebar/        # Parallel route for slide-overs
lib/
├── supabase/
│   ├── server.ts        # Server-side client
│   ├── client.ts        # Browser client
│   └── middleware.ts    # Session refresh
```

### Server vs Client Components
- **Server Components (default)**: Data fetching, auth checks, database queries. Use `createClient()` from `lib/supabase/server.ts`
- **Client Components**: Interactive UI (Kanban drag-drop, forms, real-time subscriptions). Use `'use client'` + browser client
- **Critical**: Always call `supabase.auth.getUser()` in Server Components/Actions (not `getSession()`) to prevent CVE-2025-29927 bypass attacks

### Parallel Routes for Modals
- Use `@modal` folder for slide-over panels (e.g., lead detail view)
- Allows modal + main content to render simultaneously without client-side routing
- Example: `/pipeline/@modal/lead/[id]` overlays on `/pipeline`

---

## 2. Supabase Integration with Next.js 15

### @supabase/ssr Setup (2026 Standard)
**Install:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Server Client (async cookies in Next.js 15):**
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies() // Next.js 15: cookies() returns Promise
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) }
      }
    }
  )
}
```

**Browser Client:**
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Row Level Security (RLS) for Roles
**Schema example:**
```sql
-- Users table with role column
create table public.users (
  id uuid references auth.users primary key,
  email text,
  role text check (role in ('admin', 'advisor', 'marketing'))
);

-- RLS policy: advisors only see their assigned leads
create policy "advisors_own_leads" on public.leads
  for select using (
    auth.uid() in (
      select id from public.users where role = 'admin'
    ) or assigned_to = auth.uid()
  );
```

### Realtime Subscriptions (Kanban Updates)
**Client Component:**
```typescript
'use client'
const supabase = createClient()

useEffect(() => {
  const channel = supabase
    .channel('pipeline-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      (payload) => setLeads(prev => [...prev, payload.new])
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}, [])
```

---

## 3. Kanban Board Implementation

### Library Recommendation: **@dnd-kit** (2026 Winner)
**Why:**
- Performance: CSS transforms, 60 FPS even with 100+ cards
- Accessibility: Built-in keyboard/screen reader support
- Server Components: Works with React 19 + Next.js 15 (client-side only for drag logic)
- Active maintenance (react-beautiful-dnd deprecated by Atlassian)

**Alternatives:**
- `hello-pangea/dnd`: Community fork of react-beautiful-dnd, good for simple lists, less flexible
- `pragmatic-drag-and-drop`: Headless (< 10KB), requires custom UI implementation
- `@dnd-kit` is best balance of DX + features + performance

**Basic Setup:**
```typescript
'use client'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

function KanbanBoard({ columns, leads }) {
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {columns.map(col => (
        <SortableContext items={leads[col.id]} strategy={verticalListSortingStrategy}>
          {/* Render cards */}
        </SortableContext>
      ))}
    </DndContext>
  )
}
```

**Performance with Server Components:**
- Fetch initial Kanban data in Server Component
- Pass to Client Component for drag interactions
- Optimistic updates + Supabase mutation for persistence

---

## 4. shadcn/ui Components for CRM

### Essential Components
- **DataTable**: Server-side pagination/filtering for student lists (uses TanStack Table v9)
- **Sheet**: Slide-over panels for lead details (mobile-friendly alternative to modals)
- **Dialog**: Confirmation modals (delete lead, assign advisor)
- **Command**: Global search palette (Cmd+K) for quick navigation
- **Calendar/DatePicker**: Scheduling follow-ups, trial class bookings
- **Badge**: Lead status tags (new, contacted, trial-scheduled, enrolled)
- **Toast**: Success/error notifications (form submissions, background sync)

### DataTable Pattern
```typescript
// app/(dashboard)/students/page.tsx (Server Component)
import { DataTable } from '@/components/ui/data-table'
import { columns } from './columns'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: students } = await supabase.from('students').select('*')
  return <DataTable columns={columns} data={students} />
}
```

### Command Palette Integration
```typescript
// Global search for leads, students, notes
<Command>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandGroup heading="Leads">
      {/* Fuzzy search results */}
    </CommandGroup>
  </CommandList>
</Command>
```

---

## 5. Supabase Free Tier Limits (2026)

### Quotas
- **Database:** 500 MB storage (Postgres)
- **Auth:** 50,000 MAUs (Monthly Active Users)
- **Storage:** 1 GB file uploads
- **Bandwidth:** 5 GB/month egress
- **Edge Functions:** 2M invocations/month (free)
- **Inactivity:** Projects paused after 7 days with no DB activity

### Feasibility for Your Scale
**Users:** 3-5 active users → **0.01% of MAU limit** ✅
**Leads:** 20-50/month × 12 months = 600 leads/year
**Students:** 95 active records
**Total DB Size:** ~10 MB (500 MB limit) ✅
**Bandwidth:** Low traffic dashboard (~200 MB/month vs 5 GB limit) ✅

**Verdict:** Free tier is **more than sufficient** for 2+ years. Upgrade to Pro ($25/month) only if:
- Need daily backups (Free tier has none)
- Exceed 5 GB bandwidth (unlikely with 5 users)
- Want to remove 7-day inactivity pause

### Cost Projection (Pro Tier)
If you upgrade:
- $25/month base
- 100K MAUs, 8 GB DB, 250 GB bandwidth included
- ~$27/month total (your usage won't trigger overages)

---

## Key Recommendations

1. **Use Server Components by default**, Client Components only for interactivity (forms, Kanban drag)
2. **Implement RLS policies early** to avoid security refactors later
3. **Choose @dnd-kit** for Kanban (best 2026 option)
4. **Start on Free tier**, no blocker for your scale
5. **Always call `getUser()` not `getSession()`** in server-side code (security critical)
6. **Use TanStack Table v9** via shadcn DataTable for student lists
7. **Leverage Realtime** for collaborative Kanban (advisors see updates instantly)

---

## Unresolved Questions

- **File uploads**: Will you store student documents (contracts, IDs)? 1 GB may fill quickly if scanning PDFs. Consider external S3 bucket.
- **Reporting/Analytics**: Do you need dashboards (enrollment rates, conversion funnels)? May require custom SQL views or external tool (Metabase).
- **Internationalization**: CRM UI in English only, or support for Chinese/Vietnamese? Affects i18n setup.
