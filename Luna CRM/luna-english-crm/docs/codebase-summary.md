# Codebase Summary

## Stats
- **Framework**: Next.js 16.1.6 (App Router, TypeScript strict)
- **Components**: 80 files (19 UI base + 61 feature)
- **Pages**: 8 (login, pipeline, reminders, students, activities, reports, settings, + leads redirect)
- **API Routes**: 6 routes (2 webhooks for Zalo/Facebook + 4 cron endpoints)
- **Server Actions**: 15 files (auth, lead, reminder, student, activity, notification, dashboard, integration, message, stage-notes, scheduled-activity, checklist, email, zalo-message, ensure-user-profile)
- **Hooks**: 3 (use-realtime-leads, use-optimistic-kanban, use-realtime-notifications)
- **Integrations**: 7 files (Zalo client, Facebook client, Zalo webhook handler, Facebook webhook handler, message queue processor, message queue backoff, webhook idempotency)
- **Database**: 24 SQL migrations (001-024), seed data, RLS policies
- **Dashboard Views**: 4 (lead_funnel, lead_source_breakdown, advisor_performance, monthly_lead_trend)

## File Inventory

### Components (80 files)
**UI Base (19)**: button, badge, card, input, label, textarea, sheet, dialog, table, dropdown-menu, separator, avatar, scroll-area, select, tabs, popover, calendar, command, checkbox

**Pipeline (23)**: kanban-board, kanban-column, lead-card, lead-card-sla-timer, lead-detail-sheet, lead-detail-info, lead-detail-activities, lead-detail-reminders, lead-detail-zalo, lead-stage-notes-panel, stage-next-steps-checklist, quick-add-lead-sheet, filter-bar, command-search, lead-list-view, pipeline-view, assign-advisor-select, add-activity-form, add-scheduled-activity-dialog, scheduled-activity-list, activities-page-view, send-email-dialog, send-zalo-dialog

**Students (11)**: student-data-table, student-columns, student-detail-sheet, student-detail-info, student-status-badge, student-status-transition, renewal-countdown, csv-import-dialog, csv-column-mapper, csv-preview-table, create-student-dialog, students-client

**Dashboard (7)**: dashboard-view, kpi-card, kpi-cards-row, date-range-filter, pipeline-funnel-chart, leads-by-source-chart, monthly-trend-chart, advisor-performance-table

**Reminders (4)**: reminder-dashboard, reminder-section, reminder-card, create-reminder-dialog

**Settings (6)**: integration-settings, zalo-connection-card, facebook-connection-card, webhook-status-card, webhook-events-table, stage-config-settings

**Layout (8)**: sidebar, sidebar-nav-items, sidebar-mobile, header, user-menu, notification-bell, notification-dropdown, notification-item

**Auth (1)**: login-form

### Server Actions (lib/actions/)
| File | Queries |
|------|---------|
| auth-actions | login, logout, getCurrentUser |
| lead-actions | createLead, updateLead, deleteLead, updateLeadStage, searchLeads |
| ensure-user-profile | ensureUserProfile (initialize admin/advisor users at first login) |
| reminder-actions | createReminder, updateReminder, completeReminder, deleteReminder |
| student-actions | createStudent, updateStudent, importStudentsCSV, updateStudentStatus |
| activity-actions | addActivity, deleteActivity |
| notification-actions | getNotifications, markAsRead, markAllAsRead |
| dashboard-actions | getDashboardKPIs, getLeadFunnel, getLeadsBySource, getMonthlyTrend |
| integration-actions | saveIntegrationToken, getIntegrationStatus |
| message-actions | queueMessage, processMessageQueue, updateRetryStatus |
| stage-notes-actions | saveStageNote, getStageNotes, getStageNoteHistory |
| scheduled-activity-actions | createScheduledActivity, updateActivityStatus, getUpcomingActivities |
| checklist-actions | getStageChecklist, toggleChecklistItem, getChecklistProgress |
| email-actions | sendLeadEmail, getEmailTemplates, previewEmailTemplate |
| zalo-message-actions | sendZaloMessage, getZaloTemplates, previewZaloTemplate |

### Hooks (lib/hooks/)
| Hook | Purpose |
|------|---------|
| use-realtime-leads | Subscribe to lead updates via Supabase realtime |
| use-optimistic-kanban | Optimistic UI updates for Kanban drag-drop |
| use-realtime-notifications | Subscribe to user notifications |

### Integrations (lib/integrations/)
| File | Purpose |
|------|---------|
| zalo-client.ts | Zalo OA API (send message, get profile) |
| facebook-client.ts | Facebook Graph API (send message) |
| zalo-webhook-handler.ts | Process Zalo webhook events (message_receive, etc.) |
| facebook-webhook-handler.ts | Process Facebook webhook events |
| message-queue-processor.ts | Retry failed messages with exponential backoff |
| message-queue-backoff.ts | Backoff strategy calculation for retries |
| webhook-idempotency.ts | Deduplication for duplicate webhook events |

### Constants & Types
- **navigation.ts**: Nav items with string iconName + role access
- **pipeline-stages.ts**: 8 Vietnamese stage labels + colors
- **roles.ts**: admin, advisor, marketing role definitions
- **reminder-types.ts**: 4 reminder type labels
- **leads.ts**: Lead, LeadActivity, LeadSource, StageNote, ScheduledActivity, StageNextStepConfig types
- **users.ts**: User, UserRole types
- **database.ts**: PostgreSQL table types (auto-generated)
- **email-templates.ts**: EmailTemplate type
- **zalo-templates.ts**: ZaloMessageTemplate type

### Utils
- **utils.ts**: cn() helper for Tailwind class merging
- **format.ts**: formatDate, formatPhone, formatCurrency
- **csv-parser.ts**: Parse CSV leads with column mapping + validation
- **referral-code.ts**: Generate unique referral codes
- **template-renderer.ts**: renderTemplate() for {{var}} placeholder substitution
