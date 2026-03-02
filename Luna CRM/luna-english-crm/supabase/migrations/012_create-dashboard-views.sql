-- ============================================================================
-- Migration 012: SQL views for dashboard analytics
-- ============================================================================

-- View: lead funnel — count of leads by pipeline stage in order
CREATE OR REPLACE VIEW public.lead_funnel AS
SELECT
  current_stage,
  COUNT(*) AS lead_count,
  CASE current_stage
    WHEN 'moi_tiep_nhan'    THEN 1
    WHEN 'da_tu_van'        THEN 2
    WHEN 'dang_nurture'     THEN 3
    WHEN 'dat_lich_hoc_thu' THEN 4
    WHEN 'dang_hoc_thu'     THEN 5
    WHEN 'cho_chot'         THEN 6
    WHEN 'da_dang_ky'       THEN 7
    WHEN 'mat_lead'         THEN 8
  END AS stage_order
FROM public.leads
GROUP BY current_stage
ORDER BY stage_order;

-- View: lead source breakdown — count of leads by source
CREATE OR REPLACE VIEW public.lead_source_breakdown AS
SELECT
  source,
  COUNT(*) AS lead_count
FROM public.leads
GROUP BY source
ORDER BY lead_count DESC;

-- View: advisor performance — per-advisor conversion stats
CREATE OR REPLACE VIEW public.advisor_performance AS
SELECT
  u.id AS advisor_id,
  u.full_name AS advisor_name,
  COUNT(l.id) AS total_leads,
  COUNT(l.id) FILTER (WHERE l.current_stage = 'da_dang_ky') AS converted,
  CASE
    WHEN COUNT(l.id) > 0
    THEN ROUND(
      (COUNT(l.id) FILTER (WHERE l.current_stage = 'da_dang_ky'))::NUMERIC
      / COUNT(l.id) * 100, 2
    )
    ELSE 0
  END AS conversion_rate
FROM public.users u
LEFT JOIN public.leads l ON l.assigned_to = u.id
WHERE u.role = 'advisor'
GROUP BY u.id, u.full_name
ORDER BY conversion_rate DESC;

-- View: monthly lead trend — count of new leads by month for last 12 months
CREATE OR REPLACE VIEW public.monthly_lead_trend AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS lead_count
FROM public.leads
WHERE created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
