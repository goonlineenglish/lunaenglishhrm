# Luna HRM — Deployment Guide

---

## System Requirements

### **Development**
- Node.js 18+
- npm or pnpm
- PostgreSQL client (psql) — optional, for debugging
- Git

### **Production (Dell Ubuntu Server)**
- Ubuntu 20.04 LTS or 22.04 LTS
- Node.js 18+ runtime
- Caddy or Nginx (reverse proxy, optional)
- PM2 or systemd (process manager)
- 512MB+ free disk space
- ~300MB RAM (Next.js + database connections)

---

## Database Setup (Supabase Cloud)

### **Step 1: Create Supabase Project**

1. Go to [supabase.com](https://supabase.com)
2. Create free account
3. Create new project
   - Organization: (your name)
   - Project name: `luna-hrm`
   - Region: Pick closest to your location
   - Database password: Generate strong password
4. Wait for project to initialize (~2 min)

### **Step 2: Create Database Schema**

Once project is ready:

1. Go to **SQL Editor** tab
2. Create the 16 tables

**Minimal schema (copy into SQL editor):**

```sql
-- 1. branches
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  manager_id UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. employees (extended profile)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  employee_code TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  name_en TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  position TEXT CHECK (position IN ('teacher', 'assistant', 'office')),
  role TEXT CHECK (role IN ('admin', 'branch_manager', 'accountant', 'employee')),
  rate_per_session BIGINT DEFAULT 0,
  sub_rate BIGINT DEFAULT 0,
  has_labor_contract BOOLEAN DEFAULT false,
  dependent_count INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  join_date DATE,
  -- Extended personal info
  date_of_birth DATE,
  id_number TEXT,
  id_issue_date DATE,
  id_issue_place TEXT,
  address TEXT,
  emergency_contact TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  nationality TEXT,
  -- Professional
  qualifications TEXT,
  teaching_license TEXT,
  -- HR notes
  characteristics TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(branch_id, employee_code)
);

-- 3. class_schedules (1 record = 1 class, multiple days)
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  class_code TEXT NOT NULL,
  class_name TEXT NOT NULL,
  shift_time TEXT,
  days_of_week INT[] DEFAULT '{}',
  teacher_id UUID REFERENCES employees(id),
  assistant_id UUID REFERENCES employees(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(branch_id, class_code)
);

-- 4. attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES class_schedules(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('1', '0', 'KP', '0.5')),
  marked_by UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(schedule_id, employee_id, date)
);

-- 5. employee_weekly_notes (per-employee structured notes, replaces weekly_notes)
CREATE TABLE employee_weekly_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  week_start DATE NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id),
  note_type TEXT NOT NULL CHECK (note_type IN ('substitute', 'bonus', 'penalty', 'extra_job', 'general')),
  description TEXT,
  amount NUMERIC,
  amount_unit TEXT CHECK (amount_unit IN ('sessions', 'vnd')),
  is_processed BOOLEAN DEFAULT false,
  processed_by UUID REFERENCES employees(id),
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. kpi_evaluations
CREATE TABLE kpi_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  month INT,
  year INT,
  base_pass BOOLEAN DEFAULT false,
  tsi_score INT,
  tsi_comment TEXT,
  funtime_score INT,
  funtime_comment TEXT,
  parent_score INT,
  parent_comment TEXT,
  student_score INT,
  student_comment TEXT,
  demeanor_score INT,
  demeanor_comment TEXT,
  total_score INT GENERATED ALWAYS AS (
    (COALESCE(tsi_score, 0) + COALESCE(funtime_score, 0) +
     COALESCE(parent_score, 0) + COALESCE(student_score, 0) +
     COALESCE(demeanor_score, 0))
  ) STORED,
  bonus_amount BIGINT GENERATED ALWAYS AS (total_score * 50000) STORED,
  evaluated_by UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

-- 7. payroll_periods
CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  month INT,
  year INT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'sent')),
  total_gross BIGINT DEFAULT 0,
  total_net BIGINT DEFAULT 0,
  created_by UUID REFERENCES employees(id),
  confirmed_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(branch_id, month, year)
);

-- 8. payslips
CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  position TEXT,
  sessions_worked INT DEFAULT 0,
  rate_per_session BIGINT DEFAULT 0,
  teaching_pay BIGINT DEFAULT 0,
  substitute_sessions INT DEFAULT 0,
  substitute_rate BIGINT DEFAULT 0,
  substitute_pay BIGINT DEFAULT 0,
  other_pay BIGINT DEFAULT 0,
  kpi_bonus BIGINT DEFAULT 0,
  allowances BIGINT DEFAULT 0,
  gross_pay BIGINT DEFAULT 0,
  bhxh BIGINT DEFAULT 0,
  bhyt BIGINT DEFAULT 0,
  bhtn BIGINT DEFAULT 0,
  tncn BIGINT DEFAULT 0,
  penalties BIGINT DEFAULT 0,
  net_pay BIGINT DEFAULT 0,
  extra_notes TEXT,
  email_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. salary_components
CREATE TABLE salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  component_type TEXT CHECK (component_type IN ('allowance', 'deduction')),
  name TEXT NOT NULL,
  amount BIGINT DEFAULT 0,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. evaluation_templates (admin-created criteria sets)
CREATE TABLE evaluation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  applies_to TEXT CHECK (applies_to IN ('teacher', 'assistant', 'office', 'all')),
  max_total_score INT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 11. evaluation_criteria (individual criteria per template)
CREATE TABLE evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES evaluation_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  max_score INT NOT NULL,
  weight NUMERIC DEFAULT 1.0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 12. evaluation_periods (admin-defined periods)
CREATE TABLE evaluation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 13. employee_evaluations (BM evaluates employees)
CREATE TABLE employee_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  evaluator_id UUID NOT NULL REFERENCES employees(id),
  template_id UUID NOT NULL REFERENCES evaluation_templates(id),
  period_id UUID REFERENCES evaluation_periods(id),
  eval_type TEXT CHECK (eval_type IN ('periodic', 'ad_hoc')),
  total_score NUMERIC,
  overall_notes TEXT,
  bonus_impact BIGINT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 14. evaluation_scores (per-criterion scores)
CREATE TABLE evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES employee_evaluations(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES evaluation_criteria(id),
  score NUMERIC,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 15. employee_notes (quick ad-hoc notes by BM)
CREATE TABLE employee_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  author_id UUID NOT NULL REFERENCES employees(id),
  note_type TEXT CHECK (note_type IN ('praise', 'warning', 'observation', 'general')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_attendance_branch_date ON attendance(schedule_id, date);
CREATE INDEX idx_payslips_period ON payslips(payroll_period_id);
CREATE INDEX idx_class_schedules_branch ON class_schedules(branch_id, status);
CREATE INDEX idx_employees_branch ON employees(branch_id);
CREATE INDEX idx_kpi_evaluations_month_year ON kpi_evaluations(month, year);
CREATE INDEX idx_eval_criteria_template ON evaluation_criteria(template_id);
CREATE INDEX idx_employee_evaluations_employee ON employee_evaluations(employee_id);
CREATE INDEX idx_employee_evaluations_period ON employee_evaluations(period_id);
CREATE INDEX idx_evaluation_scores_evaluation ON evaluation_scores(evaluation_id);
CREATE INDEX idx_employee_notes_employee ON employee_notes(employee_id);
```

3. Execute each table creation
4. Verify tables appear in **Tables** sidebar

### **Step 3: Enable RLS (Row-Level Security)**

1. For each table:
   - Click table name
   - **RLS** → **Enable RLS**

2. Create RLS policies (see `docs/system-architecture.md` for full details)

**Quick example (employees table):**

```sql
-- Admin can see all
CREATE POLICY "admin_all" ON employees
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Branch manager sees own branch
CREATE POLICY "bm_own_branch" ON employees
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'branch_manager'
    AND branch_id = (SELECT branch_id FROM employees WHERE id = auth.uid())
  );

-- Employee sees only self
CREATE POLICY "employee_self" ON employees
  FOR SELECT TO authenticated
  USING (id = auth.uid());
```

---

## Environment Variables

### **Development (.env.local)**

Create `.env.local` in project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Email (optional)
RESEND_API_KEY=re_xxxxx

# Cron (for scheduled tasks)
CRON_SECRET=your-secret-key-here
```

**Find these in Supabase Dashboard:**
- **NEXT_PUBLIC_SUPABASE_URL:** Project Settings → API → Project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY:** Project Settings → API → Anon public key
- **SUPABASE_SERVICE_ROLE_KEY:** Project Settings → API → Service role secret

### **Production (Dell Server)**

Set environment variables via `.env.production` or systemd:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
```

---

## Local Development Setup

### **1. Clone Repository**

```bash
git clone <repo-url>
cd luna-hrm
```

### **2. Install Dependencies**

```bash
npm install
# or
pnpm install
```

### **3. Environment Setup**

Copy `.env.example` to `.env.local` and fill in Supabase keys.

### **4. Run Development Server**

```bash
npm run dev
```

Server starts on `http://localhost:3001`

### **5. Test Login**

1. Go to http://localhost:3001
2. Click "Login"
3. Use test account (create one in Supabase Auth Dashboard)

---

## Production Deployment (Dell Ubuntu)

### **Prerequisites**

- Ubuntu 20.04+ with sudo access
- Node.js 18+ installed
- Caddy installed (for reverse proxy)

### **Step 1: Clone Repository**

```bash
cd /home/ubuntu
git clone <repo-url> luna-hrm
cd luna-hrm
```

### **Step 2: Install Dependencies**

```bash
npm install --production
```

### **Step 3: Build**

```bash
npm run build
```

Verify no TypeScript errors:
```bash
npm run type-check
```

### **Step 4: Create Systemd Service**

Create `/etc/systemd/system/luna-hrm.service`:

```ini
[Unit]
Description=Luna HRM Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/luna-hrm
Environment="NODE_ENV=production"
Environment="NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
Environment="NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key"
Environment="SUPABASE_SERVICE_ROLE_KEY=your-key"
ExecStart=/usr/bin/node /home/ubuntu/luna-hrm/.next/standalone/server.js
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

### **Step 5: Start Service**

```bash
sudo systemctl daemon-reload
sudo systemctl enable luna-hrm
sudo systemctl start luna-hrm
```

Check status:
```bash
sudo systemctl status luna-hrm
```

View logs:
```bash
sudo journalctl -u luna-hrm -f
```

### **Step 6: Reverse Proxy (Caddy)**

Create `/etc/caddy/Caddyfile`:

```
hrm.example.com {
  reverse_proxy localhost:3001 {
    header_up X-Forwarded-For {http.request.remote.host}
    header_up X-Forwarded-Proto {http.request.proto}
  }
}

# Luna CRM on port 3000
crm.example.com {
  reverse_proxy localhost:3000
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

### **Step 7: Firewall Rules**

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp  # Internal only if reverse proxy
```

---

## PWA Setup

Luna HRM works as a Progressive Web App (PWA). Employees can:

1. Open Luna HRM on their phone
2. Tap **"Add to Home Screen"** (Safari/Chrome menu)
3. App installs and works offline
4. Data syncs when reconnected

**PWA files:**
- `public/manifest.json` — App metadata
- `public/icons/` — App icons (192x192, 512x512)
- Service Worker (auto-generated by Next.js)

No additional setup needed — Next.js handles PWA automatically.

---

## Backup & Recovery

### **Supabase Automatic Backups**

Supabase Cloud includes automatic daily backups. No action needed.

### **Manual Backup (Monthly)**

Export data via Supabase Dashboard:

1. Go to **Database** tab
2. **Backups** → **Create backup** (manual)
3. Download SQL dump for archival

Or via CLI:
```bash
pg_dump "postgresql://user:password@host/db" > backup-2026-03-06.sql
```

### **Disaster Recovery**

If data is corrupted:
1. Contact Supabase support (Cloud plan includes recovery)
2. Or restore from backup manually via SQL import

---

## Monitoring

### **Server Health**

Check server resources:
```bash
free -h              # RAM usage
df -h                # Disk usage
ps aux | grep node   # Process status
```

### **Application Logs**

```bash
sudo journalctl -u luna-hrm -n 100  # Last 100 lines
sudo journalctl -u luna-hrm -f      # Follow live
```

### **Database Performance**

Via Supabase Dashboard:
- **Database** → **Metrics** — View query performance
- Optimize slow queries if needed

---

## Security Checklist

- [ ] Supabase project: Enable 2FA on account
- [ ] Environment variables: Keep service key secret (never commit)
- [ ] HTTPS: Use Caddy + auto-renewing Let's Encrypt certificate
- [ ] Firewall: Only allow ports 80, 443 (and 3001 if internal)
- [ ] RLS policies: Tested (no data leaks between branches)
- [ ] Audit log: Verify all changes logged
- [ ] Backups: Tested recovery process

---

## Troubleshooting

### **App won't start**
```bash
npm run build            # Check for TypeScript errors
node .next/standalone/server.js  # Manual test
```

### **Can't connect to Supabase**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase project is active (Dashboard → Status)
- Test connectivity: `curl https://your-project.supabase.co`

### **Attendance grid slow**
- Check database indexes: `CREATE INDEX idx_attendance_branch_date ON attendance(schedule_id, date)`
- Use pagination for large datasets

### **Payroll calculation fails**
- Check payroll_periods table has the right month/year
- Verify all employees have rate_per_session set
- Check TNCN tax calculation (unit tests)

---

*Deployment Guide v1.0 | 2026-03-06*
