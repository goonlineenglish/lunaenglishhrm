# Hướng Dẫn Sử Dụng Codex Skill Pack cho Claude Code

> Tài liệu phân tích chi tiết quy trình triển khai & cách sử dụng 5 skills từ `github.com/lploc94/codex_skill`
> Audit bảo mật: PASSED — không có prompt injection, hooks, hoặc data exfiltration.

---

## Tổng Quan

**Codex Skill Pack** = 5 skills cho Claude Code, sử dụng OpenAI Codex CLI làm "peer reviewer". Claude Code và Codex debate qua lại (adversarial review) cho đến khi đạt consensus hoặc stalemate.

### Kiến Trúc

```
User gõ /codex-xxx trong Claude Code
        │
        ▼
Claude Code đọc SKILL.md → build prompt → ghi prompt.txt
        │
        ▼
codex-runner.js spawn "codex exec --sandbox read-only"
        │                    │
        │                    ▼
        │              Codex CLI đọc code/diff/plan
        │              (read-only, không sửa file)
        │                    │
        │                    ▼
        │              Codex trả review → output.jsonl
        │
        ▼
Claude Code poll output.jsonl → parse ISSUE-{N}
        │
        ├── Issue hợp lệ → Claude fix code/plan
        ├── Issue không hợp lệ → Claude phản bác
        │
        ▼
Resume debate via --thread-id → lặp lại
        │
        ▼
Kết thúc: APPROVE / STALEMATE / user dừng
```

---

## Yêu Cầu Hệ Thống

| Yêu cầu | Chi tiết |
|----------|----------|
| Node.js | >= 22 (hiện có: v24.13.0) |
| Claude Code CLI | Đã cài |
| OpenAI Codex CLI | `codex` trong PATH (hiện có: v0.107.0) |
| OpenAI API Key | `OPENAI_API_KEY` env var đã config |

---

## Cài Đặt / Cập Nhật

```bash
# Cài lần đầu hoặc cập nhật
npx github:lploc94/codex_skill

# Verify
node ~/.claude/skills/codex-review/scripts/codex-runner.js version
```

**Cài vào:** `~/.claude/skills/` (5 thư mục skill + 1 thư mục runner)

---

## 5 Skills Chi Tiết

### 1. `/codex-plan-review` — Review Kế Hoạch Trước Khi Code

**Khi nào dùng:** Sau khi tạo plan file (VD: `plans/phase-01.md`), trước khi bắt đầu code.

**Quy trình:**
```
1. Gõ /codex-plan-review
2. Chọn effort: low | medium | high | xhigh (mặc định: high)
3. Claude build prompt với plan path + user request + context
4. Codex đọc plan → trả ISSUE-1, ISSUE-2, ... + VERDICT
5. Claude xử lý:
   - Issue hợp lệ → sửa plan
   - Issue không hợp lệ → phản bác với evidence
6. Resume debate → Codex re-review
7. Lặp cho đến APPROVE hoặc stalemate
8. Cleanup (kill processes, xóa state dir)
```

**Output format từ Codex:**
```markdown
### ISSUE-1: Missing error handling for API timeout
- Category: risk
- Severity: high
- Problem: Plan doesn't address API timeout scenarios
- Why it matters: Production failures
- Suggested fix: Add retry logic section

### VERDICT
- Status: REVISE
- Reason: 2 high-severity gaps found
```

**Ví dụ thực tế (Luna HRM):**
```
/codex-plan-review
→ Effort: high
→ Plan: plans/phase-01-db-auth.md
→ Codex review: "ISSUE-1: RLS policy cho branch_manager thiếu check branch_id"
→ Claude fix plan
→ Round 2: Codex → APPROVE
```

---

### 2. `/codex-impl-review` — Review Code Trước Khi Commit/Merge

**Khi nào dùng:** Sau khi code xong, trước khi commit hoặc merge branch.

**2 modes:**
- **working-tree** (mặc định): review uncommitted changes (`git diff`)
- **branch**: review toàn bộ branch diff vs base (`git diff main...HEAD`)

**Quy trình:**
```
1. Gõ /codex-impl-review
2. Chọn effort + mode (working-tree hoặc branch)
3. Nếu branch mode → chọn base branch (auto-detect: main → master → remote HEAD)
4. Codex đọc diff → trả review issues
5. Claude fix code cho valid issues, phản bác invalid issues
6. Branch mode: commit fixes trước khi resume (Codex đọc committed diff)
7. Lặp cho đến APPROVE hoặc stalemate
```

**Lưu ý quan trọng:**
- Codex chạy `--sandbox read-only` → CHỈ đọc, không sửa file
- Claude Code là bên thực hiện code fixes
- Branch mode yêu cầu working tree sạch (commit hoặc stash trước)

---

### 3. `/codex-think-about` — Peer Debate Kỹ Thuật

**Khi nào dùng:** Cần debate về technical decision, architecture choice, trade-offs.

**Khác biệt:** Không có reviewer/implementer — Claude và Codex là **peers ngang hàng**.

**Quy trình:**
```
1. Gõ /codex-think-about "Nên dùng Supabase RLS hay middleware auth?"
2. Chọn effort
3. Claude gửi câu hỏi + project context cho Codex
4. Codex suy nghĩ độc lập → trả Key Insights / Considerations / Recommendations
5. Claude respond: agree/disagree/new perspectives
6. Lặp cho đến consensus hoặc stalemate
7. Output cuối: agreements, disagreements, recommendations, confidence level
```

**Ví dụ:**
```
/codex-think-about "Redis vs in-memory session cho HRM 50-200 users?"
→ Codex: In-memory đủ cho scale này, Redis overkill
→ Claude: Đồng ý, nhưng Supabase Auth đã handle sessions
→ Consensus: Dùng Supabase Auth, không cần custom session store
→ Confidence: high
```

---

### 4. `/codex-commit-review` — Review Commit Messages

**Khi nào dùng:** Kiểm tra commit message quality trước/sau commit.

**2 modes:**
- **draft**: user cung cấp draft message text
- **last**: review N commits gần nhất (mặc định: 1)

**Quy trình:**
```
1. Gõ /codex-commit-review
2. Chọn effort (mặc định: medium) + mode (draft/last)
3. Codex đọc commit message + diff → kiểm tra:
   - Clarity (rõ ràng)
   - Conventional commits compliance (feat:/fix:/docs:)
   - Scope accuracy (message khớp với actual changes)
   - Structure (subject/body/footer)
4. Claude đề xuất revised message nếu cần
5. Lặp cho đến APPROVE
```

**AN TOÀN:** Skill KHÔNG BAO GIỜ chạy `git commit --amend` hay `git rebase`. Chỉ đề xuất message mới — user tự apply.

---

### 5. `/codex-pr-review` — Review Pull Request

**Khi nào dùng:** Trước khi merge PR — review toàn diện code + PR description + commit hygiene.

**Quy trình:**
```
1. Gõ /codex-pr-review
2. Chọn effort + base branch + PR title/description (optional)
3. Codex đọc:
   - Branch diff: git diff base...HEAD
   - Commit log: git log base..HEAD
   - PR description
4. Codex review:
   - Code: correctness, regressions, edge cases, security, performance
   - PR-level: description accuracy, commit hygiene, scope
5. Claude fix code issues, phản bác invalid points
6. Lặp cho đến APPROVE hoặc stalemate
```

---

## Effort Levels

| Level | Depth | Dùng khi | Thời gian ước tính |
|-------|-------|----------|-------------------|
| `low` | Surface check | Quick sanity check | 30-60s |
| `medium` | Standard review | Day-to-day work | 1-2 phút |
| `high` | Deep analysis | Important features | 2-5 phút |
| `xhigh` | Exhaustive | Critical/security-sensitive | 5-10 phút |

---

## Poll & Progress Reporting

Khi Codex đang chạy, Claude Code poll định kỳ và báo cáo hoạt động cụ thể:

**Adaptive polling intervals:**
- Round 1: 60s → 60s → 30s → 15s...
- Round 2+: 30s → 15s...

**Progress messages (ví dụ):**
```
Codex [15s]: Đang đọc file src/lib/auth.ts
Codex [30s]: Đang phân tích RLS policies
Codex [45s]: Đang tìm kiếm "supabase" trong codebase
Codex [60s]: Đã đọc 8 files, đang tổng hợp review
```

---

## Error Handling

| Exit Code | Ý nghĩa | Xử lý |
|-----------|---------|-------|
| 0 | Success | Đọc review.txt |
| 2 | Timeout (mặc định 3600s) | Report partial results, suggest lower effort |
| 3 | Turn failed | Retry 1 lần, nếu vẫn fail → report error |
| 4 | Stalled (không output ~3 phút) | Report partial results, suggest lower effort |
| 5 | Codex CLI not found | Cài Codex CLI: `npm i -g @openai/codex` |

---

## Stalemate Handling

Khi cùng issues lặp lại 2 rounds liên tiếp không có progress mới:
1. Liệt kê các điểm deadlock
2. Hiển thị argument cuối cùng của mỗi bên
3. Đề xuất bên nào user nên chọn
4. Hỏi user: chấp nhận trạng thái hiện tại hoặc thêm 1 round

---

## Workflow Gợi Ý Cho Dự Án

### Trước khi code (Planning)
```
1. Tạo plan file → /codex-plan-review (effort: high)
2. Fix plan theo feedback
3. Bắt đầu implement
```

### Trong khi code (Implementation)
```
1. Code xong 1 feature/phase
2. /codex-impl-review --working-tree (effort: medium)
3. Fix issues
4. Commit
```

### Technical decisions
```
/codex-think-about "Câu hỏi kỹ thuật cụ thể?"
→ Đọc consensus/disagreements → quyết định
```

### Trước khi merge (PR)
```
1. Push branch
2. /codex-pr-review (effort: high)
3. Fix issues
4. /codex-commit-review (effort: medium)
5. Merge
```

---

## Cấu Trúc File Đã Cài

```
~/.claude/skills/
├── codex-review/
│   └── scripts/
│       └── codex-runner.js          ← Runner chung (Node.js, stdlib only)
├── codex-plan-review/
│   ├── SKILL.md                     ← Skill definition + runner path
│   └── references/
│       ├── prompts.md               ← Prompt templates
│       ├── workflow.md              ← Execution steps
│       └── output-format.md         ← Output contract
├── codex-impl-review/
│   ├── SKILL.md
│   └── references/ (same structure)
├── codex-think-about/
│   ├── SKILL.md
│   └── references/ (same structure)
├── codex-commit-review/
│   ├── SKILL.md
│   └── references/ (same structure)
└── codex-pr-review/
    ├── SKILL.md
    └── references/ (same structure)
```

**State directory** (tạm, tự cleanup): `{working-dir}/.codex-review/runs/`

---

## Audit Bảo Mật (Tóm Tắt)

| Kiểm tra | Kết quả |
|----------|---------|
| Prompt injection | Không có |
| Data exfiltration | Không có |
| Hooks lấy thông tin | Không có |
| Network calls ẩn | Không có |
| Đọc env vars / API keys | Không (Codex CLI tự handle) |
| Sandbox mode | `--sandbox read-only` (Codex chỉ đọc) |
| File access scope | Chỉ trong working dir + state dir |
| Process cleanup | Watchdog tự kill sau timeout |

---

*Tạo: 2026-03-06 | Audit & guide cho codex_skill v9*
