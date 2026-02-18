# Phase 06: Dashboard & Reports

## Context Links

- Parent plan: [plan.md](./plan.md)
- Dependencies: [Phase 03](./phase-03-lead-pipeline-kanban.md), [Phase 04](./phase-04-follow-up-automation.md), [Phase 05](./phase-05-retention-and-students.md)
- Research: [Brainstorm Report](../260218-luna-crm-brainstorm-report.md)

## Overview

- **Date:** 2026-02-18
- **Priority:** P2
- **Status:** Pending
- **Effort:** 5h

Build the analytics dashboard: KPI cards, pipeline funnel chart, leads by source breakdown, monthly trend, advisor performance table, date range filtering. Add weekly auto-report via Vercel Cron. Dashboard accessible to admin and marketing roles.

## Key Insights

- Use `recharts` for charts (React-native, SSR-friendly, good defaults)
- All chart data computed server-side via Supabase SQL views or queries -- no client-side aggregation
- KPI calculations: conversion rate = (ĐÃ ĐĂNG KÝ count / total leads) * 100
- Avg response time: time between lead created_at and first activity (type=call|message)
- Revenue forecast: count of CHỜ CHỐT leads * avg tuition (configurable)
- Weekly report: Cron generates summary, stores in DB or sends email
- Marketing role can view dashboard but not pipeline or student details

## Requirements

### Functional
- KPI cards row: total leads (this month), conversion rate, avg first response time, active students, revenue forecast
- Pipeline funnel chart: stacked bars or funnel showing count at each stage
- Leads by source: pie chart or horizontal bar (Facebook, Zalo, walk-in, website, phone, referral)
- Monthly trend: line chart showing leads created per month (last 6-12 months)
- Advisor performance table: columns = advisor name, leads handled, conversion rate, avg response time
- Date range filter: applies to all KPIs and charts
- Compare periods: this month vs last month (% change indicators)
- Weekly auto-report: Cron job creates summary, stores as report record
- Admin: full access | Marketing: view-only access | Advisor: no access

### Non-functional
- Dashboard loads < 2 seconds (pre-aggregated queries)
- Charts responsive on mobile (stack vertically)
- KPI cards show trend arrows (up/down vs previous period)

## Architecture

```
Dashboard Page:
  /reports (Server Component)
  └── Fetch aggregated data via Supabase queries/views
      └── <DashboardView /> (Client Component)
          ├── <DateRangeFilter />
          ├── <KPICardsRow />
          │   ├── Total Leads card
          │   ├── Conversion Rate card
          │   ├── Avg Response Time card
          │   ├── Active Students card
          │   └── Revenue Forecast card
          ├── <PipelineFunnelChart />
          ├── <LeadsBySourceChart />
          ├── <MonthlyTrendChart />
          └── <AdvisorPerformanceTable />

Data Queries (Server-side):
  1. Total leads: COUNT leads WHERE created_at IN range
  2. Conversion rate: COUNT(stage=da_dang_ky) / COUNT(all) * 100
  3. Avg response time: AVG(first_activity.created_at - lead.created_at)
  4. Funnel: COUNT GROUP BY current_stage
  5. By source: COUNT GROUP BY source
  6. Monthly trend: COUNT GROUP BY DATE_TRUNC('month', created_at)
  7. Advisor perf: GROUP BY assigned_to with conversion calc

Weekly Report Cron:
  Vercel Cron (Sunday 8pm) → POST /api/cron/weekly-report
  → Run all KPI queries for past week
  → Store summary in reports table
  → (Optional) Send email via Resend
```

### Supabase SQL Views

```sql
-- Lead funnel view
CREATE VIEW lead_funnel AS
SELECT current_stage, COUNT(*) as count
FROM leads
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY current_stage
ORDER BY CASE current_stage
  WHEN 'moi_tiep_nhan' THEN 1
  WHEN 'da_tu_van' THEN 2
  WHEN 'dang_nurture' THEN 3
  WHEN 'dat_lich_hoc_thu' THEN 4
  WHEN 'dang_hoc_thu' THEN 5
  WHEN 'cho_chot' THEN 6
  WHEN 'da_dang_ky' THEN 7
  WHEN 'mat_lead' THEN 8
END;

-- Advisor performance view
CREATE VIEW advisor_performance AS
SELECT
  u.full_name,
  u.id as advisor_id,
  COUNT(l.id) as total_leads,
  COUNT(l.id) FILTER (WHERE l.current_stage = 'da_dang_ky') as converted,
  ROUND(COUNT(l.id) FILTER (WHERE l.current_stage = 'da_dang_ky')::decimal / NULLIF(COUNT(l.id), 0) * 100, 1) as conversion_rate
FROM users u
LEFT JOIN leads l ON l.assigned_to = u.id
WHERE u.role = 'advisor'
GROUP BY u.id, u.full_name;
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `app/(dashboard)/reports/page.tsx` | Server component: fetch KPI data, render DashboardView |
| `app/(dashboard)/reports/loading.tsx` | Skeleton loader with chart placeholders |
| `components/dashboard/dashboard-view.tsx` | Client orchestrator: date filter, KPIs, charts |
| `components/dashboard/date-range-filter.tsx` | Date range picker with presets (7d, 30d, 90d, custom) |
| `components/dashboard/kpi-cards-row.tsx` | Row of 5 KPI cards |
| `components/dashboard/kpi-card.tsx` | Single KPI: value, label, trend arrow, % change |
| `components/dashboard/pipeline-funnel-chart.tsx` | Funnel/bar chart of leads per stage |
| `components/dashboard/leads-by-source-chart.tsx` | Pie or horizontal bar chart |
| `components/dashboard/monthly-trend-chart.tsx` | Line chart of leads over months |
| `components/dashboard/advisor-performance-table.tsx` | Table: advisor stats |
| `lib/actions/dashboard-actions.ts` | Server actions: fetchKPIs, fetchFunnel, fetchSourceBreakdown, etc. |
| `lib/queries/dashboard-queries.ts` | Supabase query builders for aggregations |
| `app/api/cron/weekly-report/route.ts` | Cron endpoint: generate weekly summary |
| `supabase/migrations/012_create-dashboard-views.sql` | SQL views for aggregations |
| `supabase/migrations/013_create-reports-table.sql` | Weekly reports storage table |

### Files to Modify

| File | Change |
|------|--------|
| `vercel.json` | Add weekly report cron schedule |

## Implementation Steps

1. **Create dashboard SQL views** `supabase/migrations/012_create-dashboard-views.sql`
   - `lead_funnel`: count by stage with ordering
   - `lead_source_breakdown`: count by source
   - `advisor_performance`: leads, converted, conversion rate per advisor
   - `monthly_lead_trend`: count by month for last 12 months

2. **Create reports table** `supabase/migrations/013_create-reports-table.sql`
   ```sql
   CREATE TABLE public.reports (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     report_type TEXT NOT NULL DEFAULT 'weekly',
     period_start DATE NOT NULL,
     period_end DATE NOT NULL,
     data JSONB NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Create dashboard queries** `lib/queries/dashboard-queries.ts`
   - `queryTotalLeads(dateRange)`: count leads in range
   - `queryConversionRate(dateRange)`: enrolled / total * 100
   - `queryAvgResponseTime(dateRange)`: avg time to first activity
   - `queryActiveStudents()`: count students status=active
   - `queryRevenueForecast()`: cho_chot count * avg tuition (config)
   - `queryFunnelData(dateRange)`: from view
   - `querySourceBreakdown(dateRange)`: from view
   - `queryMonthlyTrend()`: from view
   - `queryAdvisorPerformance(dateRange)`: from view

4. **Create dashboard server actions** `lib/actions/dashboard-actions.ts`
   - `fetchDashboardData(dateRange)`: call all queries, return combined object
   - `fetchPreviousPeriod(dateRange)`: same queries for comparison period

5. **Create reports page** `app/(dashboard)/reports/page.tsx`
   - Server component: verify role (admin or marketing only)
   - Fetch default data (last 30 days)
   - Render `<DashboardView initialData={data} />`

6. **Create DashboardView** `components/dashboard/dashboard-view.tsx`
   - `'use client'` component
   - State: dateRange (default 30 days)
   - DateRangeFilter at top
   - On filter change: refetch data via server action
   - Layout: KPIs row → Charts grid (2 cols) → Advisor table

7. **Create DateRangeFilter** `components/dashboard/date-range-filter.tsx`
   - Presets: "7 ngay", "30 ngay", "90 ngay", "Tuy chinh"
   - Custom: shadcn Calendar date range picker
   - Compare toggle: show % change vs previous period

8. **Create KPICardsRow** `components/dashboard/kpi-cards-row.tsx`
   - 5 `<KPICard />` components in responsive grid (5 cols desktop, 2-3 mobile)

9. **Create KPICard** `components/dashboard/kpi-card.tsx`
   - Icon, label (Vietnamese), value (large), trend arrow + % change
   - Colors: green up, red down
   - Labels: "Tong leads", "Ty le chuyen doi", "TG phan hoi TB", "HS dang hoc", "DT du kien"

10. **Create PipelineFunnelChart** `components/dashboard/pipeline-funnel-chart.tsx`
    - Recharts BarChart (horizontal bars, stage labels Vietnamese)
    - Bars colored by stage (use pipeline-stages constants)
    - Tooltip showing count and % of total

11. **Create LeadsBySourceChart** `components/dashboard/leads-by-source-chart.tsx`
    - Recharts PieChart with legend
    - Source labels Vietnamese: Facebook, Zalo, Di bo, Website, Dien thoai, Gioi thieu
    - Color palette from Luna brand

12. **Create MonthlyTrendChart** `components/dashboard/monthly-trend-chart.tsx`
    - Recharts LineChart, x-axis months, y-axis count
    - Two lines: total leads (blue), enrolled (green)
    - Last 6-12 months

13. **Create AdvisorPerformanceTable** `components/dashboard/advisor-performance-table.tsx`
    - Simple table (not full DataTable): advisor name, total leads, converted, conversion rate, avg response time
    - Sorted by conversion rate desc
    - Highlight top performer

14. **Create weekly report cron** `app/api/cron/weekly-report/route.ts`
    - Verify CRON_SECRET
    - Run all KPI queries for past 7 days
    - Insert into `reports` table as JSONB
    - Optional: send email via Resend API (if configured)
    - Return summary

15. **Update vercel.json** add weekly cron
    ```json
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 13 * * 0"
    }
    ```
    (Sunday 8pm Vietnam = 1pm UTC)

## Todo List

- [ ] Create SQL views for dashboard aggregations
- [ ] Create reports table migration
- [ ] Create dashboard query builders
- [ ] Create dashboard server actions
- [ ] Create reports page (server component, role check)
- [ ] Create DashboardView client component
- [ ] Create DateRangeFilter with presets
- [ ] Create KPICardsRow + KPICard
- [ ] Create PipelineFunnelChart
- [ ] Create LeadsBySourceChart
- [ ] Create MonthlyTrendChart
- [ ] Create AdvisorPerformanceTable
- [ ] Create weekly report cron endpoint
- [ ] Update vercel.json with cron schedule
- [ ] Test KPIs with sample data
- [ ] Test charts render correctly
- [ ] Test date range filter updates all components
- [ ] Test mobile responsive layout
- [ ] Test role access (marketing view-only, advisor blocked)

## Success Criteria

- Dashboard loads < 2 seconds with all KPIs and charts
- KPI cards show current values with trend vs previous period
- Funnel chart correctly orders 8 stages
- Source breakdown matches actual lead sources
- Monthly trend shows historical data
- Advisor table ranks by conversion rate
- Date range filter updates all components
- Marketing role can view, advisor gets redirect
- Weekly cron generates and stores report

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slow queries on large dataset | Dashboard takes too long | SQL views pre-aggregate; indexes on created_at, stage, source |
| Chart library SSR issues | Hydration errors | Use dynamic import with `ssr: false` for chart components |
| Revenue forecast inaccurate | Misleading KPI | Make avg tuition configurable in settings; label as "estimate" |
| Weekly email fails | Missing reports | Store in DB regardless; email is optional enhancement |

## Security Considerations

- Dashboard route protected: admin + marketing roles only
- Advisor redirected to /pipeline if they try /reports
- SQL views respect RLS (or use service role for aggregation)
- Weekly report cron protected by CRON_SECRET
- No PII in report summaries (only aggregated counts)

## Next Steps

- Phase 7 integrations may add CPL (cost per lead) from Facebook ad spend API
- Future: embed dashboard in Zalo Mini App for mobile access
