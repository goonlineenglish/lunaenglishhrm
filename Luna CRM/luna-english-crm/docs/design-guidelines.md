# Design Guidelines

## Brand Identity
- **Brand**: Luna English (Tan Mai branch)
- **Language**: Vietnamese throughout UI
- **Tone**: Professional, warm, education-focused

## Color System (oklch)

### Light Mode
| Token | Value | Use |
|-------|-------|-----|
| primary | oklch(0.28 0.12 310) | #3E1A51 deep purple — buttons, links, headers |
| secondary | oklch(0.65 0.14 230) | #3FA5DC blue — accents, secondary actions |
| background | oklch(0.985 0.002 300) | Page background |
| card | oklch(1 0 0) | Card surfaces |
| destructive | oklch(0.58 0.22 15) | Error, delete actions |
| muted | oklch(0.96 0.005 300) | Disabled, subtle backgrounds |

### Sidebar
| Token | Value | Use |
|-------|-------|-----|
| sidebar | oklch(0.22 0.1 310) | Dark purple background |
| sidebar-primary | oklch(0.65 0.14 230) | Blue active states |
| sidebar-accent | oklch(0.30 0.1 310) | Hover state |

### Charts
5-color palette: purple, blue, green, yellow, red (consistent across all charts)

## Typography
- Font: Geist Sans (body) + Geist Mono (code)
- Loaded via Next.js font optimization

## Component Library
- Base: shadcn/ui (Radix UI primitives)
- Notifications: Sonner toast
- Tables: @tanstack/react-table with shadcn Table
- Drag-drop: @dnd-kit

## Layout
- Sidebar: fixed left, dark purple, collapsible on mobile
- Header: top bar with search, notifications, user menu
- Content: scrollable main area with responsive padding
- Radius: 0.625rem base

## Responsive
- Mobile: sidebar collapses to hamburger menu
- Tablet: sidebar overlay
- Desktop: persistent sidebar
