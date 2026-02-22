# Code Standards

## TypeScript
- Strict mode enabled
- Path alias: `@/` maps to project root
- Prefer explicit types over `any`
- Use `interface` for object shapes, `type` for unions/intersections

## File Naming
- kebab-case for all files: `lead-detail-sheet.tsx`, `use-realtime-leads.ts`
- Components: PascalCase exports, kebab-case files
- Server actions: `{domain}-actions.ts` (e.g., `lead-actions.ts`)
- Hooks: `use-{name}.ts`

## Component Patterns

### Server vs Client
- Default to Server Components
- Add `"use client"` only when needed (hooks, browser APIs, interactivity)
- Never pass Lucide icon components from Server → Client; use string `iconName` + `ICON_MAP`

### Data Fetching
- Server Components: direct Supabase queries via `createClient()` from `lib/supabase/server.ts`
- Client mutations: Server Actions in `lib/actions/`
- Realtime: custom hooks in `lib/hooks/` using Supabase realtime subscriptions

### Next.js 16 Patterns
- `await cookies()` — cookies is async in Next.js 16
- `supabase.auth.getUser()` on server — never `getSession()`
- Route groups: `(auth)` for public, `(dashboard)` for protected

## Styling
- Tailwind CSS v4 (CSS-first config in `globals.css`)
- Design tokens via CSS custom properties (oklch color space)
- Luna brand: primary=`#3E1A51` (purple), secondary=`#3FA5DC` (blue)
- Use shadcn/ui components; customize via Tailwind classes
- Responsive: mobile-first approach

## Database
- All table/column names: snake_case
- Vietnamese enum values: `moi_tiep_nhan`, `da_tu_van`, etc.
- RLS policies on every table
- Migrations numbered sequentially: `001_`, `002_`, etc.

## Error Handling
- Server actions: return `{ success: boolean, error?: string }`
- Client: use Sonner `toast.success()` / `toast.error()` (not shadcn toast)
- Wrap Supabase calls in try/catch

## Imports
- Use `@/` path alias for all imports
- Group: React → Next.js → external libs → internal modules → types
- shadcn/ui: `@/components/ui/{component}`
