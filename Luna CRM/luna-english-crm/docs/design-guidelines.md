# Design Guidelines

## Brand Identity
- **Brand**: Luna English (Tan Mai branch)
- **Language**: Vietnamese throughout UI
- **Tone**: Professional, warm, education-focused

## Color System (oklch in globals.css)

### Light Mode
| Token | oklch | Hex | Use |
|-------|-------|-----|-----|
| primary | 0.28 0.12 310 | #3E1A51 | Buttons, links, headers |
| secondary | 0.65 0.14 230 | #3FA5DC | Accents, secondary actions |
| background | 0.985 0.002 300 | #F8F7FA | Page background |
| card | 1 0 0 | #FFFFFF | Card surfaces |
| destructive | 0.58 0.22 15 | #CC0000 | Error, delete |
| muted | 0.96 0.005 300 | #F0EEFD | Disabled, subtle |

### Sidebar Theme
| Token | oklch | Use |
|-------|-------|-----|
| sidebar | 0.22 0.1 310 | Dark purple background |
| sidebar-primary | 0.65 0.14 230 | Active states (blue) |
| sidebar-accent | 0.30 0.1 310 | Hover state |

### Charts
5-color palette: purple (#3E1A51), blue (#3FA5DC), green (#10B981), amber (#FBBF24), red (#EF4444)

## Typography
- Font: Geist Sans (body), Geist Mono (code)
- Loaded via Next.js font optimization
- Base scale: 16px (1rem = 16px)

## Component Library
- Base: shadcn/ui (Radix UI primitives)
- Notifications: Sonner toast (not shadcn toast)
- Tables: @tanstack/react-table with shadcn Table
- Drag-drop: @dnd-kit

## Layout
- Sidebar: fixed left, dark purple, collapsible on mobile
- Header: top bar with search, notifications, user menu
- Content: scrollable main area with responsive padding
- Border radius: 0.625rem (10px base)

## Responsive Breakpoints
- Mobile: < 640px (sidebar → hamburger)
- Tablet: 640px–1024px (sidebar overlay)
- Desktop: >= 1024px (persistent sidebar)
