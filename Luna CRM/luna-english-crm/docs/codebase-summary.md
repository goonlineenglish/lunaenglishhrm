# Codebase Summary

## Stats
- **Framework**: Next.js 16.1.6 (App Router, TypeScript strict)
- **Components**: 75 files (13 UI base + 62 feature)
- **Pages**: 7 (login, pipeline, reminders, students, reports, settings, activities)
- **API Routes**: 4 webhooks (Zalo, Facebook) + 4 cron endpoints
- **Server Actions**: 14 files (auth, lead, reminder, student, activity, notification, dashboard, integration, message, stage-notes, scheduled-activity, checklist, email, zalo-message)
- **Hooks**: 3 (use-realtime-leads, use-optimistic-kanban, use-realtime-notifications)
- **Integrations**: 5 (Zalo/Facebook clients, webhook handlers, message queue processor)
- **Database**: 21 SQL migrations (001-021), seed data, RLS policies
- **Dashboard Views**: 4 (lead_funnel, lead_source_breakdown, advisor_performance, monthly_lead_trend)

## File Inventory

### Components (75 files)
**UI Base (13)**: button, badge, card, input, label, textarea, sheet, dialog, table, dropdown-menu, separator, avatar, scroll-area, select, tabs, popover, calendar, command

**Pipeline (21)**: kanban-board, kanban-column, lead-card, lead-card-sla-timer, lead-detail-sheet, lead-detail-info, lead-detail-activities, lead-detail-reminders, lead-detail-zalo, quick-add-lead-sheet, filter-bar, command-search, lead-list-view, assign-advisor-select, pipeline-view, add-activity-form, lead-stage-notes-panel, add-scheduled-activity-dialog, scheduled-activity-list, activities-page-view, stage-next-steps-checklist, send-email-dialog, send-zalo-dialog

**Students (10)**: student-data-table, student-columns, student-detail-sheet, student-detail-info, student-status-badge, student-status-transition, renewal-countdown, csv-import-dialog, csv-column-mapper, csv-preview-table, create-student-dialog

**Dashboard (7)**: dashboard-view, kpi-card, kpi-cards-row, date-range-filter, pipeline-funnel-chart, leads-by-source-chart, monthly-trend-chart, advisor-performance-table

**Reminders (4)**: reminder-dashboard, reminder-section, reminder-card, create-reminder-dialog

**Settings (5)**: integration-settings, zalo-connection-card, facebook-connection-card, webhook-status-card, webhook-events-table, stage-config-settings

**Layout (7)**: sidebar, sidebar-nav-items, sidebar-mobile, header, user-menu, notification-bell, notification-dropdown, notification-item

**Auth (1)**: login-form

### Server Actions (lib/actions/)
| File | Queries |
|------|---------|
| auth-actions | login, logout, getCurrentUser |
| lead-actions | createLead, updateLead, deleteLead, updateLeadStage, searchLeads |
| reminder-actions | createReminder, updateReminder, completeReminder, deleteReminder |
| student-actions | createStudent, updateStudent, importStudentsCSV, updateStudentStatus |
| activity-actions | addActivity, deleteActivity |
| notification-actions | getNotifications, markAsRead, markAllAsRead |
| dashboard-actions | getDashboardKPIs, getLeadFunnel, getLeadsBySource, getMonthlyTrend |
| integration-actions | saveIntegrationToken, getIntegrationStatus |
| message-actions | queueMessage, processMessageQueue, updateRetryStatus |
| stage-notes-actions | saveStageNote, getStageNotes |
| scheduled-activity-actions | createScheduledActivity, updateActivityStatus, getUpcomingActivities |
| checklist-actions | getStageChecklist, toggleChecklistItem |
| email-actions | sendLeadEmail, getEmailTemplates |
| zalo-message-actions | sendZaloMessage, getZaloTemplates |

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
