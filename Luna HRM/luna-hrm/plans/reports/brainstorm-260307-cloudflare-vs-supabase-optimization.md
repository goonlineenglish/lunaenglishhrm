# Brainstorm: Cloudflare Database vs Supabase Optimization

**Date:** 2026-03-07
**Context:** Supabase Cloud chậm (query, auth, cold start). Đồng nghiệp đề xuất Cloudflare.
**Outcome:** Khuyến nghị Giải pháp A — tối ưu Supabase hiện tại.

---

## Vấn đề

Supabase Free tier gặp 3 vấn đề:
1. **Cold start** — DB pause sau 7 ngày idle, wake up mất 5-10s
2. **Auth chậm** — `getUser()` gọi API mỗi request (round-trip VN→Singapore ~200ms)
3. **Query chậm** — Latency 30-50ms/query × N+1 pattern trong payroll

## Giải pháp đã đánh giá

### A: Tối ưu Supabase (RECOMMENDED)
- **Effort:** 1-2 ngày | **Cost:** $0-25/tháng
- Keep-alive cron ping mỗi 6 ngày → no cold start
- JWT local validation (`jose`) → auth ~2ms thay vì ~200ms
- Connection pooling + fix N+1 → query giảm 50-70%
- Optional: Supabase Pro ($25/th) = DB luôn ON

### B: Cloudflare Hyperdrive
- **Effort:** 2-3 tuần | **Cost:** $5/tháng
- Connection accelerator cho external PostgreSQL
- Phải refactor toàn bộ data layer sang `pg` client
- Mất RLS → auth middleware
- **Không khuyến nghị** — effort quá lớn so với benefit

### C: Self-host PostgreSQL trên Dell
- **Effort:** 3-4 tuần | **Cost:** $0
- Latency < 1ms (localhost) — nhanh nhất
- Phải viết lại: 24 files, 93 queries, toàn bộ auth system, xóa 68 RLS policies
- Rủi ro: Dell hỏng = mất data, phải tự backup
- **Chỉ nên xem xét** nếu Supabase hoàn toàn không đáp ứng sau khi tối ưu

### D: Cloudflare D1
- **Effort:** 5-6 tuần | **Cost:** $0-5/tháng
- D1 là **SQLite**, KHÔNG phải PostgreSQL
- Mất: RLS, Auth, UUID, JSONB, NUMERIC, Foreign Keys đầy đủ
- **Loại bỏ** — viết lại hoàn toàn app, kết quả kém hơn

## Ma trận so sánh

| | Effort | Cost | Cold start | Auth | Query | Rủi ro |
|---|---|---|---|---|---|---|
| A: Tối ưu Supabase | 1-2 ngày | $0-25 | Solved | ~2ms | -50-70% | Thấp |
| B: Hyperdrive | 2-3 tuần | $5 | Solved | Viết lại | Fast | TB |
| C: Self-host PG | 3-4 tuần | $0 | Solved | Viết lại | <1ms | Cao |
| D: Cloudflare D1 | 5-6 tuần | $0-5 | Solved | Viết lại | SQLite | Rất cao |

## Cloudflare Workers Limits (tham khảo)

| | Free | Paid ($5/th) |
|---|---|---|
| CPU time | 10ms/request | 30s default, max 5min |
| Memory | 128MB | 128MB (cố định) |
| Bundle size | 3MB gzip | 10MB gzip |
| Requests | 100k/ngày | 10M/tháng |
| Cron triggers | 5 | 250 |
| Connections | 6 đồng thời | 6 đồng thời |

## Kết luận

Giải pháp A giải quyết đúng root cause với effort tối thiểu:
- Cold start: cron keep-alive hoặc $25 Pro
- Auth: local JWT validation
- Query: connection pooling + N+1 fix

Chuyển database là **over-engineering** cho vấn đề latency có thể fix bằng optimization.
