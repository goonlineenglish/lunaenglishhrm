# Brainstorm: Soft Delete Strategy for Luna CRM

## Problem
App hiện không có chức năng xóa dữ liệu. Advisor nhập sai data → không cách nào sửa ngoài truy cập DB trực tiếp. Cần giải pháp xóa an toàn, có thể undo.

## Approach Chosen: Soft Delete (`deleted_at` column)

### Scope
| Table | Soft delete | Lý do |
|-------|------------|-------|
| `leads` | Yes | Core data, nhập sai phổ biến |
| `students` | Yes | Core, liên kết Sheet sync |
| `lead_activities` | Yes | Advisor tạo nhầm activity |
| `follow_up_reminders` | No (hard delete OK) | Ephemeral, tự hết hạn |
| `notifications` | No | Transient |
| `lead_stage_notes` | Yes | Ghi chú stage quan trọng |

### Permission Matrix
| Role | Leads | Students | Activities | Stage Notes |
|------|-------|----------|------------|-------------|
| Admin | Delete + Restore + Purge | Delete + Restore + Purge | Delete + Restore | Delete + Restore |
| Advisor | Delete own + Restore own | No | Delete own + Restore own | Delete own |
| Marketing | No | No | No | No |

- **Purge** = hard delete (admin only), dùng cho dọn test data. Implement phase sau nếu cần.

### Implementation Requirements

1. **Migration**: thêm `deleted_at TIMESTAMPTZ` cho leads, students, lead_activities, lead_stage_notes
2. **RLS policies**: update tất cả SELECT policies thêm `AND deleted_at IS NULL`
3. **Server actions**: thêm `softDelete()`, `restore()` actions cho mỗi entity
4. **UI**: nút xóa + confirm dialog, trash/recycle bin view cho admin
5. **Sheet sync**: outbound skip deleted rows; inbound không restore deleted rows

### Google Sheet Sync Impact
- **Outbound**: `buildStudentsTab()` thêm `.is("deleted_at", null)` filter
- **Inbound**: nếu Sheet row match student có `deleted_at` → skip (CRM wins cho delete, không auto-restore)
- **Snapshot**: chỉ snapshot active records

### Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| Quên filter deleted_at ở query mới | RLS policy level filter (defense-in-depth) |
| Cascade: xóa lead → student/activities orphan? | Soft delete cascade: khi xóa lead, auto soft-delete student + activities liên quan |
| Sheet sync ghi đè deleted row | Inbound check deleted_at trước khi upsert |
| Data phình | Optional purge cron (xóa soft-deleted > 90 ngày) — implement sau |

### Success Criteria
- [ ] Advisor xóa lead nhập sai → lead biến mất khỏi pipeline
- [ ] Admin restore lead đã xóa → lead quay lại đúng stage cũ
- [ ] Sheet sync không ghi đè row đã xóa
- [ ] Không có query nào show deleted data (trừ admin trash view)

### Architectural Notes
- RLS là defense-in-depth: nếu dev quên filter ở app level, RLS vẫn chặn
- `deleted_at` ưu tiên hơn `is_deleted` boolean vì có audit timestamp
- Soft delete cascade nên dùng DB trigger (không phải app logic) để đảm bảo consistency

## Unresolved
- Purge policy (xóa vĩnh viễn sau bao lâu?) — để quyết định khi cần
- Email notification khi admin purge? — probably YAGNI
