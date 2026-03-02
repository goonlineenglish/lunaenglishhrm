# Design Guidelines

**Last Updated**: 2026-03-02

## Brand Identity

### Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Indigo | #4F46E5 | Buttons, links, focus states, badges |
| **Primary Dark** | Indigo Dark | #4338CA | Hover states, active buttons |
| **Secondary** | Sky | #0EA5E9 | Accent text, secondary buttons |
| **Success** | Emerald | #10B981 | Completion states, checkmarks, progress |
| **Warning** | Amber | #F59E0B | Alerts, caution states, locked courses |
| **Error** | Rose | #F43F5E | Error states, delete actions, validation |
| **Neutral 50** | Light Gray | #F9FAFB | Page background, light surfaces |
| **Neutral 100** | Lighter Gray | #F3F4F6 | Card backgrounds, borders |
| **Neutral 500** | Medium Gray | #6B7280 | Secondary text, disabled state |
| **Neutral 700** | Dark Gray | #374151 | Body text |
| **Neutral 900** | Almost Black | #111827 | Headings, primary text |

### Theme Mode
- Light mode default (no dark mode Phase 1)
- High contrast for accessibility (WCAG AA minimum)

## Typography

### Font Stack
```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
}

code, pre {
  font-family: 'Fira Code', 'Courier New', monospace;
}
```

### Type Scales

| Element | Font Size | Line Height | Weight | Use Case |
|---------|-----------|------------|--------|----------|
| **H1** | 32px | 40px | 700 | Page titles |
| **H2** | 24px | 32px | 600 | Section titles |
| **H3** | 20px | 28px | 600 | Subsection titles |
| **Body** | 16px | 24px | 400 | Main content, paragraphs |
| **Small** | 14px | 20px | 400 | Labels, secondary text |
| **Tiny** | 12px | 16px | 400 | Badges, metadata |

### Line Length
- Body text: 45-75 characters per line for readability
- Use max-width: 672px (42rem) for text blocks

## Component Library: shadcn/ui

All UI components use shadcn/ui with Tailwind v4 CSS-first configuration.

### Component Library: shadcn/ui

All UI components use shadcn/ui with Tailwind v4 CSS-first configuration.

### Core Components
- **Buttons**: Primary, secondary, ghost, destructive
- **Forms**: Input, textarea, select, checkbox, radio
- **Tables**: Sortable, paginated course/user lists
- **Dialog**: Confirmations (delete), modals (edit)
- **Sidebar**: Navigation (admin + teacher)
- **Tabs**: Dashboard sections, settings groups
- **Skeleton**: Loading state (course cards, tables)
- **Toast**: Success/error notifications
- **Card**: Content containers (courses, lesson plans)
- **Badge**: Status indicators (completed, locked)

### Component Structure
```typescript
// components/shared/button.tsx — shadcn base
// components/dashboard/course-card.tsx — domain component
// components/course-player/drm-zone.tsx — feature component
```

### Role Badges
Use color-coded badges to identify user roles across the admin panel and dashboard:

| Role | Badge Color | Tailwind Classes |
|------|------------|-----------------|
| **ADMIN** | Indigo | `bg-indigo-100 text-indigo-800` |
| **MANAGER** | Sky | `bg-sky-100 text-sky-800` |
| **TEACHER** | Emerald | `bg-emerald-100 text-emerald-800` |
| **TEACHING_ASSISTANT** | Amber | `bg-amber-100 text-amber-800` |

```tsx
// Role badge component
const ROLE_BADGE_STYLES: Record<Role, string> = {
  ADMIN: 'bg-indigo-100 text-indigo-800',
  MANAGER: 'bg-sky-100 text-sky-800',
  TEACHER: 'bg-emerald-100 text-emerald-800',
  TEACHING_ASSISTANT: 'bg-amber-100 text-amber-800',
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Quan ly',
  TEACHER: 'Giao vien',
  TEACHING_ASSISTANT: 'Tro giang',
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge className={ROLE_BADGE_STYLES[role]}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}
```

### Course Level Badge
```tsx
<Badge className={course.level === 'ADVANCED' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
  {course.level === 'ADVANCED' ? 'Nang cao' : 'Co ban'}
</Badge>
```

### Color Application
```tsx
// Primary action
<Button variant="default" className="bg-indigo-600 hover:bg-indigo-700">
  Enroll Course
</Button>

// Secondary action
<Button variant="outline" className="border-indigo-200">
  Cancel
</Button>

// Success state
<Badge className="bg-emerald-100 text-emerald-800">
  Completed
</Badge>

// Locked course warning
<Badge className="bg-amber-100 text-amber-800" icon={LockIcon}>
  Locked
</Badge>
```

## Layout & Spacing

### Base Unit: 4px (Tailwind)
```
Spacing scale: 4px, 8px, 12px, 16px, 24px, 32px, 40px, 48px, 64px...
Use Tailwind: p-1 (4px), p-2 (8px), p-3 (12px), p-4 (16px), etc.
```

### Breakpoints
```
Mobile: 0–639px
Tablet: 640px–1023px
Desktop: 1024px+

Tailwind: sm (640px), md (768px), lg (1024px), xl (1280px)
```

### Admin Panel (Tablet+)
- Sidebar navigation fixed on left (max 240px)
- Main content area responsive
- Minimum 768px width for admin features

### Mobile-First (360px minimum)
- Full-width on mobile
- Single column layout
- Touch-friendly button size: 44px minimum
- Collapsible navigation (hamburger menu)

### Grid System
```tsx
// Dashboard grid: 1 col on mobile, 2 on tablet, 3+ on desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {courses.map(course => <CourseCard key={course.id} course={course} />)}
</div>
```

## DRM Zone Styling

### CSS Scoped Protection
```tsx
<div className="drm-zone">
  {/* Lesson player + content */}
</div>

<style>{`
  .drm-zone {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
  }

  .drm-zone::before {
    /* Transparent overlay for right-click blocking */
    content: '';
    position: absolute;
    inset: 0;
    z-index: 9998;
    pointer-events: none;
  }

  /* Video controls remain accessible */
  .drm-zone video::-webkit-media-controls {
    pointer-events: auto;
  }
`}</style>
```

### Watermark Component Spec

**Watermark Overlay**:
- Position: Fixed overlay inside `.drm-zone`
- Z-index: 9999 (above content but below dialogs)
- Opacity: 15% (not obstructive)
- Font: 14px mono, gray-400
- Rotation: Random angle (-15° to +15°)
- Content: `user@example.com - 2025-03-02 14:35`
- Refresh: Every 30 seconds at random position

```tsx
export function WatermarkOverlay({ userId }: { userId: string }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const userEmail = useUserEmail();
  const timestamp = new Date().toLocaleString();

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition({
        x: Math.random() * (window.innerWidth - 200),
        y: Math.random() * (window.innerHeight - 50)
      });
      setRotation(Math.random() * 30 - 15);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed pointer-events-none text-gray-400 opacity-15 font-mono text-sm"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `rotate(${rotation}deg)`,
        zIndex: 9999
      }}
    >
      {userEmail} - {timestamp}
    </div>
  );
}
```

## Empty State Design

### Empty Course List
```tsx
export function EmptyCourses() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <GraduationCapIcon className="h-12 w-12 text-neutral-300 mb-4" />
      <h3 className="text-lg font-semibold text-neutral-900">
        No courses yet
      </h3>
      <p className="text-neutral-600 mt-1">
        You will see enrolled courses here
      </p>
      <Button className="mt-6">Contact Administrator</Button>
    </div>
  );
}
```

### Empty Lesson Plans
```tsx
export function EmptyLessonPlans() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <FileTextIcon className="h-12 w-12 text-neutral-300 mb-4" />
      <h3 className="text-lg font-semibold text-neutral-900">
        No lesson plans
      </h3>
      <p className="text-neutral-600 mt-1">
        Create your first lesson plan to get started
      </p>
      <Button className="mt-6">+ New Lesson Plan</Button>
    </div>
  );
}
```

## Manager Reports View

Manager reports show school-scoped data (teachers and TAs in same school).

### Reports Table Layout
```tsx
<div className="space-y-4">
  <h2 className="text-xl font-semibold">Bao cao truong {manager.school}</h2>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Ten</TableHead>
        <TableHead>Vai tro</TableHead>
        <TableHead>Khoa hoc</TableHead>
        <TableHead>Hoan thanh</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {schoolUsers.map(user => (
        <TableRow key={user.id}>
          <TableCell>{user.name}</TableCell>
          <TableCell><RoleBadge role={user.role} /></TableCell>
          <TableCell>{user.coursesEnrolled}</TableCell>
          <TableCell>{user.completionPercentage}%</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

## Loading States

### Skeleton Loaders
```tsx
// Course card skeleton
<div className="space-y-2 p-4 bg-neutral-100 rounded-lg">
  <Skeleton className="h-6 w-3/4" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-8 w-1/4 mt-4" />
</div>

// Table skeleton (5 rows)
<div className="space-y-2">
  {[...Array(5)].map((_, i) => (
    <Skeleton key={i} className="h-12 w-full" />
  ))}
</div>
```

**Never show white flash** — preload skeleton immediately while data loads.

## Locked Course Visual Pattern

### Locked Badge
```tsx
export function LockedCourseBadge() {
  return (
    <div className="absolute top-2 right-2">
      <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
        <LockIcon className="h-3 w-3" />
        Locked
      </Badge>
    </div>
  );
}
```

### Locked Course Card
```tsx
export function CourseCard({ course, locked }: CourseCardProps) {
  return (
    <div
      className={classNames(
        'p-4 rounded-lg border cursor-pointer transition',
        locked
          ? 'bg-neutral-50 border-neutral-200 opacity-60 cursor-not-allowed'
          : 'bg-white border-neutral-200 hover:border-indigo-300'
      )}
    >
      {locked && <LockedCourseBadge />}
      <h3 className="font-semibold">{course.title}</h3>
      {!locked && <ProgressBar value={course.progress} />}
      {locked && (
        <Tooltip text="Contact administrator to enroll">
          <span className="text-sm text-neutral-600">
            Not enrolled in {course.program.name}
          </span>
        </Tooltip>
      )}
    </div>
  );
}
```

**No error page redirect** — locked course shown with message in place.

## Error State Design

### Form Validation Errors
```tsx
<div className="space-y-4">
  <div>
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      className={errors.email ? 'border-rose-500' : ''}
      {...register('email')}
    />
    {errors.email && (
      <p className="text-rose-600 text-sm mt-1">{errors.email.message}</p>
    )}
  </div>
</div>
```

### Server Error Toast
```tsx
if (!result.success) {
  showToast({
    type: 'error',
    title: 'Action Failed',
    description: result.error,
    duration: 5000
  });
}
```

## Accessibility

### Keyboard Navigation
- Tab order follows logical flow (left-right, top-bottom)
- Focus visible on all interactive elements (outline: 2px solid indigo-600)
- Shortcuts: Enter activates buttons, Escape closes modals
- Skip link: "Skip to main content" (hidden, visible on focus)

### ARIA Labels
```tsx
// Icon-only buttons need labels
<Button aria-label="Delete course">
  <TrashIcon className="h-4 w-4" />
</Button>

// Form inputs need labels
<Label htmlFor="course-title">Course Title</Label>
<Input id="course-title" />

// Regions need labels
<nav aria-label="Main navigation">...</nav>
<main aria-label="Lesson player">...</main>
```

### Color Contrast
- Text: 4.5:1 minimum (WCAG AAA for regular text)
- Large text: 3:1 minimum
- UI components: 3:1 minimum
- No color-only indicators (always include icon or text)

### Screen Reader Support
```tsx
// Announcements for progress updates
<div aria-live="polite" aria-atomic="true">
  {progressMessage}
</div>

// Status badges need context
<Badge className="bg-emerald-100">
  <CheckIcon className="mr-1" />
  Completed
</Badge>
```

## Progress Indicator Component

### Linear Progress Bar
```tsx
export function ProgressBar({ value, total }: ProgressBarProps) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-neutral-600">Progress</span>
        <span className="text-sm font-semibold">{percentage}%</span>
      </div>
      <div className="w-full bg-neutral-200 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

### Course Card with Progress
```tsx
<div className="bg-white rounded-lg p-4 border">
  <h3 className="font-semibold">{course.title}</h3>
  <p className="text-sm text-neutral-600 mt-1">{course.lessonCount} lessons</p>
  <ProgressBar value={course.completedLessons} total={course.lessonCount} />
  <Button className="mt-4 w-full">Continue</Button>
</div>
```

## Tiptap Editor Styling

### Rich Text Editor Container
```css
.tiptap-editor {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  min-height: 300px;
  max-height: 800px;
  overflow-y: auto;
  font-size: 16px;
  line-height: 1.5;
}

.tiptap-editor h1 { @apply text-3xl font-bold; }
.tiptap-editor h2 { @apply text-2xl font-bold; }
.tiptap-editor h3 { @apply text-xl font-bold; }
.tiptap-editor p { @apply my-3; }
.tiptap-editor ul { @apply list-disc list-inside my-3; }
.tiptap-editor ol { @apply list-decimal list-inside my-3; }
.tiptap-editor code { @apply bg-neutral-100 px-2 py-1 rounded font-mono text-sm; }
.tiptap-editor table { @apply border-collapse border border-neutral-300; }
.tiptap-editor th, .tiptap-editor td { @apply border border-neutral-300 px-3 py-2; }

.tiptap-toolbar {
  border-bottom: 1px solid #e5e7eb;
  padding: 0.5rem;
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  background-color: #f9fafb;
}

.tiptap-toolbar button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  background-color: white;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 14px;
}

.tiptap-toolbar button:hover {
  background-color: #f3f4f6;
}

.tiptap-toolbar button.is-active {
  background-color: #4f46e5;
  color: white;
  border-color: #4338ca;
}
```

## Responsive Design Patterns

### Two-Column Admin Panel
```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-screen">
  {/* Sidebar: 1 col on mobile, hidden on small screens */}
  <aside className="hidden md:block bg-neutral-900">
    <AdminSidebar />
  </aside>

  {/* Main: full width on mobile, 3 cols on tablet+ */}
  <main className="md:col-span-3 overflow-auto">
    <AdminContent />
  </main>
</div>
```

### Course Player Full-Screen
```tsx
<div className="flex flex-col h-screen lg:flex-row">
  {/* Video: full width on mobile, 2/3 on desktop */}
  <div className="flex-1 bg-black flex items-center justify-center">
    <VideoPlayer />
  </div>

  {/* Sidebar: full width below video on mobile, 1/3 on desktop */}
  <aside className="w-full lg:w-1/3 bg-white border-l overflow-y-auto">
    <LessonSidebar />
  </aside>
</div>
```

## Dark Mode (Future)

Dark mode not included in Phase 1. When implemented:
- Use Tailwind `dark:` prefix
- Swap color palette (dark backgrounds, light text)
- Keep contrast ratios 4.5:1+
- Test all components in dark mode
