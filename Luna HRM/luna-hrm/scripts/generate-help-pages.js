/**
 * Converts markdown user guides to static HTML blog pages.
 * Output: public/helps/index.html + 4 guide pages
 * No dependencies needed — pure Node.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const GUIDES_DIR = path.join(ROOT, 'docs', 'user-guides')
const OUT_DIR = path.join(ROOT, 'public', 'helps')

const guides = [
  { slug: 'branch-manager-setup', file: 'user-guide-branch-manager-setup.md', title: 'Thiết Lập Hệ Thống', role: 'Admin', icon: '🏗️', desc: 'Hướng dẫn Admin thiết lập chi nhánh, thêm nhân viên, tạo lịch lớp và chấm công.' },
  { slug: 'branch-manager', file: 'user-guide-branch-manager.md', title: 'Quản Lý Cơ Sở', role: 'Branch Manager', icon: '📋', desc: 'Quản lý lịch học, chấm công, phê duyệt lương, theo dõi KPI.' },
  { slug: 'accountant', file: 'user-guide-accountant.md', title: 'Kế Toán', role: 'Accountant', icon: '💰', desc: 'Tính lương, quản lý phụ cấp & khấu trừ, tính thuế TNCN, xuất báo cáo.' },
  { slug: 'employee', file: 'user-guide-employee.md', title: 'Nhân Viên', role: 'Employee', icon: '👤', desc: 'Xem chấm công, bảng lương, hồ sơ cá nhân và KPI.' },
]

// ========================= Markdown → HTML =========================

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function parseInline(text) {
  // Images
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    if (src.startsWith('./images/')) src = `/helps/images/${src.slice(9)}`
    return `<figure class="img-wrap"><img src="${src}" alt="${escapeHtml(alt)}" loading="lazy"/>${alt ? `<figcaption>${escapeHtml(alt)}</figcaption>` : ''}</figure>`
  })
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  return text
}

function mdToHtml(md) {
  const lines = md.split('\n')
  const out = []
  let i = 0
  let inList = false
  let listType = ''

  function closeList() {
    if (inList) { out.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false }
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty line
    if (trimmed === '') { closeList(); i++; continue }

    // Code block
    if (trimmed.startsWith('```')) {
      closeList()
      const lang = trimmed.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]))
        i++
      }
      i++ // skip closing
      out.push(`<div class="code-block">${lang ? `<div class="code-lang">${escapeHtml(lang)}</div>` : ''}<pre><code>${codeLines.join('\n')}</code></pre></div>`)
      continue
    }

    // Heading
    const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (hMatch) {
      closeList()
      const level = hMatch[1].length
      const text = hMatch[2]
      const id = text.toLowerCase().replace(/[^\w\sà-ỹ-]/g, '').replace(/\s+/g, '-')
      out.push(`<h${level} id="${id}">${parseInline(text)}</h${level}>`)
      i++; continue
    }

    // HR
    if (trimmed === '---' || trimmed === '***') {
      closeList()
      out.push('<hr/>')
      i++; continue
    }

    // Standalone image
    if (trimmed.startsWith('![')) {
      closeList()
      out.push(parseInline(trimmed))
      i++; continue
    }

    // Table
    if (trimmed.startsWith('|')) {
      closeList()
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().split('|').filter(Boolean).map(c => c.trim())
        if (!cells.every(c => /^[-:\s]+$/.test(c))) rows.push(cells)
        i++
      }
      if (rows.length > 0) {
        let table = '<div class="table-wrap"><table><thead><tr>'
        rows[0].forEach(c => { table += `<th>${parseInline(c)}</th>` })
        table += '</tr></thead><tbody>'
        for (let r = 1; r < rows.length; r++) {
          table += '<tr>'
          rows[r].forEach(c => { table += `<td>${parseInline(c)}</td>` })
          table += '</tr>'
        }
        table += '</tbody></table></div>'
        out.push(table)
      }
      continue
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/)
    if (olMatch) {
      if (!inList || listType !== 'ol') { closeList(); out.push('<ol>'); inList = true; listType = 'ol' }
      out.push(`<li>${parseInline(olMatch[2])}</li>`)
      i++; continue
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    if (ulMatch) {
      if (!inList || listType !== 'ul') { closeList(); out.push('<ul>'); inList = true; listType = 'ul' }
      out.push(`<li>${parseInline(ulMatch[1])}</li>`)
      i++; continue
    }

    // Indented sub-items (treat as continuation)
    if (/^\s{2,}[-*+]\s/.test(line) || /^\s{2,}\d+\.\s/.test(line)) {
      const subMatch = trimmed.match(/^[-*+]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/)
      if (subMatch) {
        out.push(`<li class="sub-item">${parseInline(subMatch[1])}</li>`)
        i++; continue
      }
    }

    // Regular paragraph
    closeList()
    out.push(`<p>${parseInline(trimmed)}</p>`)
    i++
  }
  closeList()
  return out.join('\n')
}

// ========================= CSS =========================

const CSS = `
:root {
  --primary: #3E1A51;
  --primary-light: #5a2d73;
  --secondary: #4a7cc9;
  --bg: #f8f7fc;
  --card: #ffffff;
  --text: #1a1a2e;
  --text-muted: #6b6b8d;
  --border: #e5e5ef;
  --code-bg: #f3f1f9;
  --radius: 12px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: var(--text);
  background: var(--bg);
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

/* Header */
.header {
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: #fff;
  position: sticky; top: 0; z-index: 50;
  box-shadow: 0 2px 12px rgba(62,26,81,0.2);
}
.header-inner {
  max-width: 1100px; margin: 0 auto;
  padding: 0 24px;
  display: flex; align-items: center; justify-content: space-between;
  height: 60px;
}
.logo {
  display: flex; align-items: center; gap: 12px;
  text-decoration: none; color: #fff;
}
.logo-icon {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 18px;
}
.logo h1 { font-size: 18px; font-weight: 700; }
.logo small { font-size: 11px; opacity: 0.7; display: block; }
.login-btn {
  background: rgba(255,255,255,0.15);
  color: #fff; text-decoration: none;
  padding: 8px 18px; border-radius: 8px;
  font-size: 14px; transition: background 0.2s;
}
.login-btn:hover { background: rgba(255,255,255,0.25); }

/* Nav */
.nav {
  background: var(--card); border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.nav-inner {
  max-width: 1100px; margin: 0 auto;
  padding: 0 24px;
  display: flex; gap: 4px; overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.nav a {
  padding: 10px 16px; font-size: 14px;
  color: var(--text-muted); text-decoration: none;
  border-bottom: 2px solid transparent;
  white-space: nowrap; transition: all 0.2s;
}
.nav a:hover, .nav a.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* Main */
.main {
  max-width: 860px; margin: 0 auto;
  padding: 32px 24px 80px;
}

/* Guide Cards */
.cards {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px; margin-top: 32px;
}
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  text-decoration: none; color: inherit;
  transition: all 0.25s ease;
  display: flex; gap: 16px;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(62,26,81,0.1);
  border-color: var(--primary-light);
}
.card-icon { font-size: 40px; flex-shrink: 0; }
.card h2 { font-size: 18px; font-weight: 700; color: var(--primary); margin-bottom: 4px; }
.card .role {
  display: inline-block; font-size: 11px;
  background: rgba(62,26,81,0.08); color: var(--primary);
  padding: 2px 8px; border-radius: 99px; font-weight: 600;
  margin-bottom: 8px;
}
.card p { font-size: 14px; color: var(--text-muted); line-height: 1.5; }
.card .arrow { font-size: 14px; color: var(--primary); margin-top: 8px; font-weight: 500; }

.hero { text-align: center; margin-bottom: 12px; }
.hero h1 { font-size: 32px; color: var(--primary); margin-bottom: 8px; }
.hero p { font-size: 17px; color: var(--text-muted); max-width: 560px; margin: 0 auto; }

.tip-box {
  margin-top: 40px; padding: 20px 24px;
  background: var(--code-bg); border-radius: var(--radius);
  border: 1px solid var(--border);
}
.tip-box h3 { font-size: 15px; margin-bottom: 8px; }
.tip-box li { font-size: 14px; color: var(--text-muted); margin: 4px 0; list-style: none; }

/* Article Styles */
.breadcrumb {
  font-size: 14px; color: var(--text-muted); margin-bottom: 20px;
}
.breadcrumb a { color: var(--secondary); text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }

.guide-header {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 32px; padding-bottom: 16px;
  border-bottom: 2px solid var(--border);
}
.guide-header span { font-size: 32px; }
.guide-header h1 { font-size: 26px; color: var(--primary); }

article h1 { font-size: 28px; font-weight: 700; color: var(--primary); margin: 32px 0 16px; padding-bottom: 12px; border-bottom: 2px solid rgba(62,26,81,0.15); }
article h2 { font-size: 22px; font-weight: 700; color: var(--primary); margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
article h3 { font-size: 18px; font-weight: 600; margin: 24px 0 8px; }
article h4 { font-size: 16px; font-weight: 600; margin: 16px 0 6px; }
article p { margin: 8px 0; color: var(--text); }
article a { color: var(--secondary); }
article strong { font-weight: 600; color: var(--text); }
article code {
  background: var(--code-bg); padding: 2px 6px;
  border-radius: 4px; font-size: 0.9em;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  color: var(--primary);
}
article ul, article ol { margin: 10px 0; padding-left: 24px; }
article li { margin: 4px 0; }
article li.sub-item { margin-left: 24px; }
article hr { margin: 32px 0; border: none; border-top: 1px solid var(--border); }

.code-block {
  margin: 16px 0; border-radius: 10px; overflow: hidden;
  border: 1px solid var(--border);
}
.code-lang {
  background: rgba(62,26,81,0.08); padding: 6px 16px;
  font-size: 12px; color: var(--primary);
  font-family: monospace; border-bottom: 1px solid var(--border);
}
.code-block pre {
  background: var(--code-bg); padding: 16px;
  overflow-x: auto; font-size: 13px; line-height: 1.6;
}
.code-block code { background: none; padding: 0; color: var(--text); }

.table-wrap { overflow-x: auto; margin: 16px 0; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { background: rgba(62,26,81,0.06); text-align: left; font-weight: 600; color: var(--primary); }
th, td { border: 1px solid var(--border); padding: 8px 12px; }
tr:nth-child(even) { background: rgba(0,0,0,0.015); }

.img-wrap { display: block; margin: 20px 0; }
.img-wrap img {
  max-width: 100%; border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  border: 1px solid var(--border);
}
.img-wrap figcaption {
  font-size: 12px; color: var(--text-muted);
  text-align: center; margin-top: 6px; font-style: italic;
}

.page-nav {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 48px; padding-top: 24px;
  border-top: 1px solid var(--border);
}
.page-nav a {
  color: var(--text-muted); text-decoration: none;
  font-size: 14px; transition: color 0.2s;
}
.page-nav a:hover { color: var(--primary); }

.footer {
  border-top: 1px solid var(--border);
  background: rgba(0,0,0,0.02);
  padding: 20px; text-align: center;
  font-size: 13px; color: var(--text-muted);
  margin-top: 40px;
}

@media (max-width: 640px) {
  .cards { grid-template-columns: 1fr; }
  .hero h1 { font-size: 24px; }
  article h1 { font-size: 22px; }
  article h2 { font-size: 18px; }
}
`

// ========================= HTML Templates =========================

function wrapPage(title, navActive, bodyHtml) {
  const navLinks = [
    { href: '/helps/', label: '🏠 Trang chủ', slug: 'home' },
    ...guides.map(g => ({ href: `/helps/${g.slug}.html`, label: g.title, slug: g.slug })),
  ]

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(title)} — Luna HRM</title>
  <meta name="description" content="Hướng dẫn sử dụng hệ thống quản lý nhân sự Luna HRM"/>
  <style>${CSS}</style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="/helps/" class="logo">
        <div class="logo-icon">L</div>
        <div>
          <h1>Luna HRM</h1>
          <small>Trung tâm Hướng dẫn</small>
        </div>
      </a>
      <a href="/login" class="login-btn">Đăng nhập</a>
    </div>
  </header>
  <nav class="nav">
    <div class="nav-inner">
      ${navLinks.map(n => `<a href="${n.href}"${n.slug === navActive ? ' class="active"' : ''}>${n.label}</a>`).join('\n      ')}
    </div>
  </nav>
  <div class="main">
    ${bodyHtml}
  </div>
  <footer class="footer">© 2026 Luna English — Luna HRM Help Center</footer>
</body>
</html>`
}

// ========================= Generate =========================

// Ensure output dirs exist
fs.mkdirSync(path.join(OUT_DIR, 'images'), { recursive: true })

// 1. Landing page
console.log('Generating index.html...')
const cardsHtml = guides.map(g => `
  <a href="/helps/${g.slug}.html" class="card">
    <div class="card-icon">${g.icon}</div>
    <div>
      <h2>${g.title}</h2>
      <span class="role">${g.role}</span>
      <p>${g.desc}</p>
      <div class="arrow">Xem hướng dẫn →</div>
    </div>
  </a>
`).join('')

const indexBody = `
  <div class="hero">
    <h1>📖 Trung tâm Hướng dẫn</h1>
    <p>Chọn vai trò của bạn để xem hướng dẫn sử dụng chi tiết hệ thống Luna HRM</p>
  </div>
  <div class="cards">${cardsHtml}</div>
  <div class="tip-box">
    <h3>💡 Lưu ý</h3>
    <ul>
      <li>• Mỗi hướng dẫn được thiết kế riêng cho từng vai trò trong hệ thống</li>
      <li>• Bao gồm hình ảnh minh họa và ví dụ thực tế</li>
      <li>• Nếu cần hỗ trợ thêm, liên hệ Admin qua email</li>
    </ul>
  </div>
`

fs.writeFileSync(path.join(OUT_DIR, 'index.html'), wrapPage('Hướng dẫn sử dụng', 'home', indexBody))
console.log('  OK')

// 2. Guide pages
for (let idx = 0; idx < guides.length; idx++) {
  const g = guides[idx]
  console.log(`Generating ${g.slug}.html...`)

  const md = fs.readFileSync(path.join(GUIDES_DIR, g.file), 'utf-8')
  const articleHtml = mdToHtml(md)

  // Prev/Next
  const prev = idx > 0 ? guides[idx - 1] : null
  const next = idx < guides.length - 1 ? guides[idx + 1] : null

  const body = `
    <div class="breadcrumb">
      <a href="/helps/">Hướng dẫn</a> / <strong>${g.title}</strong>
    </div>
    <div class="guide-header">
      <span>${g.icon}</span>
      <div>
        <h1 style="margin:0;padding:0;border:none">${g.title}</h1>
        <span class="role" style="margin-top:4px">${g.role}</span>
      </div>
    </div>
    <article>${articleHtml}</article>
    <div class="page-nav">
      ${prev ? `<a href="/helps/${prev.slug}.html">← ${prev.title}</a>` : '<div></div>'}
      ${next ? `<a href="/helps/${next.slug}.html">${next.title} →</a>` : '<div></div>'}
    </div>
  `

  fs.writeFileSync(path.join(OUT_DIR, `${g.slug}.html`), wrapPage(g.title, g.slug, body))
  console.log('  OK')
}

console.log('\n=== All pages generated in public/helps/ ===')
console.log('Files:')
fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.html')).forEach(f => console.log(`  ${f}`))
