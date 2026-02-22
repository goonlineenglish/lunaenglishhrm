# Codebase Summary

## Stats
- **Framework**: Next.js 16.1.6 (App Router)
- **Dependencies**: 20 runtime, 11 dev
- **Routes**: 6 pages + 4 API routes + 4 cron endpoints
- **Components**: 63 files (13 UI base + 50 feature)
- **Server Actions**: 9 action files
- **Migrations**: 15 SQL files
- **Hooks**: 3 realtime hooks

## Key Files

### Entry Points
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout: fonts, metadata, Sonner |
| `app/(dashboard)/layout.tsx` | Dashboard layout: sidebar, header, auth guard |
| `app/(auth)/login/page.tsx` | Login page |
| `middleware.ts` | Auth session refresh |

### Server Actions (lib/actions/)
| File | Domain |
|------|--------|
| `auth-actions.ts` | Login, logout, session |
| `lead-actions.ts` | CRUD leads, stage updates |
| `reminder-actions.ts` | CRUD reminders, mark complete |
| `student-actions.ts` | CRUD students, CSV import |
| `activity-actions.ts` | Lead activity logging |
| `notification-actions.ts` | Notification management |
| `dashboard-actions.ts` | KPI and chart data |
| `integration-actions.ts` | Zalo/Facebook token management |
| `message-actions.ts` | Message queue operations |

### Feature Components
| Directory | Count | Key Files |
|-----------|-------|-----------|
| `pipeline/` | 13 | kanban-board, lead-card, lead-detail-sheet, filter-bar |
| `students/` | 9 | student-data-table, csv-import-dialog, student-detail-sheet |
| `reminders/` | 4 | reminder-dashboard, reminder-card, create-reminder-dialog |
| `dashboard/` | 7 | kpi-cards-row, pipeline-funnel-chart, advisor-performance-table |
| `settings/` | 4 | integration-settings, zalo-connection-card |
| `layout/` | 6 | sidebar, header, notification-bell, user-menu |
| `auth/` | 1 | login-form |

### Integrations (lib/integrations/)
| File | Purpose |
|------|---------|
| `zalo-client.ts` | Zalo OA API client |
| `facebook-client.ts` | Facebook Graph API client |
| `zalo-webhook-handler.ts` | Process Zalo webhook events |
| `facebook-webhook-handler.ts` | Process Facebook webhook events |
| `message-queue-processor.ts` | Retry failed outbound messages |

### API Routes (app/api/)
| Route | Purpose |
|-------|---------|
| `webhooks/zalo/` | Zalo OA webhook receiver |
| `webhooks/facebook/` | Facebook webhook receiver |
| `cron/check-overdue-reminders/` | Flag overdue reminders |
| `cron/refresh-tokens/` | Refresh OAuth tokens |
| `cron/process-message-queue/` | Process queued messages |
| `cron/weekly-report/` | Generate weekly report |
