import { useState, useEffect } from 'react'
import { MicrosoftDataverseService } from '../generated/services/MicrosoftDataverseService'
import { ORG_URL } from '../config'

const isMetaKey = k => k.startsWith('@') || k.startsWith('odata')

const BUREAUS = [
  { key: 'CIBIL', label: 'CIBIL / TransUnion', tag: 'Primary' },
  { key: 'EXPERIAN', label: 'Experian', tag: 'Active' },
  { key: 'CRIF', label: 'CRIF High Mark', tag: 'Active' },
  { key: 'EQUIFAX', label: 'Equifax', tag: 'Active' },
]

const NOW = new Date()
const MONTH_LABEL = NOW.toLocaleString('en-US', { month: 'short' }).toUpperCase() + ' ' + NOW.getFullYear()

// ── helpers ──────────────────────────────────────────────────────────────────

function findStatusField(record) {
  if (!record) return null
  return Object.keys(record).find(k => /status/i.test(k) && !isMetaKey(k)) ?? null
}

function classifyStatus(val) {
  const s = String(val ?? '').toLowerCase()
  if (/pending|in.?progress|progress|awaiting|validat/i.test(s)) return 'pending'
  if (/error|reject|fail|critical/i.test(s)) return 'error'
  if (/accept|approv|complete/i.test(s)) return 'accepted'
  return 'other'
}

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, badge, badgeColor, ringPct }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2 min-w-0">
      {badge && (
        <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor ?? 'bg-gray-100 text-gray-600'}`}>
          {badge}
        </span>
      )}
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {ringPct != null && (
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="22" fill="none" stroke="#e5e7eb" strokeWidth="5" />
            <circle
              cx="26" cy="26" r="22" fill="none"
              stroke="#16a34a" strokeWidth="5"
              strokeDasharray={`${(ringPct / 100) * 138.2} 138.2`}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
            />
            <text x="26" y="30" textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">{ringPct}</text>
          </svg>
        )}
      </div>
      <div>
        <div className="text-3xl font-bold text-gray-900 leading-tight">{value}</div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </div>
    </div>
  )
}

function BureauCard({ name, tag, pct, recordCount, errorCount }) {
  const barColor = pct == null ? 'bg-gray-300' : pct >= 95 ? 'bg-green-500' : pct >= 90 ? 'bg-yellow-500' : 'bg-red-500'
  const pctColor = pct == null ? 'text-gray-400' : pct >= 95 ? 'text-green-600' : pct >= 90 ? 'text-yellow-600' : 'text-red-600'
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{name}</span>
        <span className="text-xs border border-gray-300 text-gray-500 rounded px-1.5 py-0.5">{tag}</span>
      </div>
      <div className={`text-3xl font-bold ${pctColor} mb-2`}>
        {pct != null ? `${pct.toFixed(1)}%` : '—'}
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
      <div className="text-xs text-gray-400">
        {recordCount != null ? `${recordCount.toLocaleString()} records` : '—'}
        {errorCount != null && errorCount > 0 && (
          <span className="ml-2 text-red-400">· {errorCount.toLocaleString()} errors</span>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ value }) {
  const cls = classifyStatus(value)
  const styles = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    accepted: 'bg-green-50 text-green-700 border-green-200',
    other: 'bg-gray-50 text-gray-600 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5 font-medium ${styles[cls]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cls === 'pending' ? 'bg-yellow-500' : cls === 'error' ? 'bg-red-500' : cls === 'accepted' ? 'bg-green-500' : 'bg-gray-400'}`} />
      {String(value)}
    </span>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function DashboardPage({ onNavigate }) {
  const [resolvedOrgUrl, setResolvedOrgUrl] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [approvals, setApprovals] = useState([])
  const [bureauRecords, setBureauRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const ROWS_PER_PAGE = 7

  // Resolve org URL
  useEffect(() => {
    MicrosoftDataverseService.GetOrganizations()
      .then(r => {
        const url = r.success && r.data?.value?.[0]?.Url
        setResolvedOrgUrl(url || ORG_URL)
      })
      .catch(() => setResolvedOrgUrl(ORG_URL))
  }, [])

  // Fetch all three tables in parallel once org URL is known
  useEffect(() => {
    if (!resolvedOrgUrl) return
    setLoading(true)
    const fetch = (table, top) =>
      MicrosoftDataverseService.ListRecordsWithOrganization(
        resolvedOrgUrl, table,
        undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined,
        undefined, top
      ).then(r => (r.success ? (r.data?.value ?? []) : []))
       .catch(() => [])

    Promise.all([
      fetch('cr045_submissionrequests', 100),
      fetch('cr045_submissionapprovals', 20),
      fetch('cr045_creditbureaus', 50),
    ]).then(([subs, approvs, bureaus]) => {
      setSubmissions(subs)
      setApprovals(approvs)
      setBureauRecords(bureaus)
      setLoading(false)
    })
  }, [resolvedOrgUrl])

  // ── KPI derivation ──────────────────────────────────────────────────────────
  const statusField = submissions.length > 0 ? findStatusField(submissions[0]) : null

  const kpis = {
    total: submissions.length,
    pending: statusField ? submissions.filter(s => classifyStatus(s[statusField]) === 'pending').length : null,
    errors: statusField ? submissions.filter(s => classifyStatus(s[statusField]) === 'error').length : null,
    accepted: statusField ? submissions.filter(s => classifyStatus(s[statusField]) === 'accepted').length : null,
  }

  // ── Bureau acceptance cards ─────────────────────────────────────────────────
  // Try to derive from bureau lookup field in approvals; fallback to named stubs
  const bureauNameField = bureauRecords.length > 0
    ? Object.keys(bureauRecords[0]).find(k => /name/i.test(k) && !isMetaKey(k))
    : null
  const fetchedBureauNames = bureauNameField
    ? bureauRecords.map(b => b[bureauNameField]).filter(Boolean)
    : []

  const bureauCards = BUREAUS.map(b => {
    // Try to find matching records in approvals by any field containing the bureau key
    const matchingApprovals = approvals.filter(a =>
      Object.values(a).some(v => typeof v === 'string' && v.toUpperCase().includes(b.key))
    )
    const matchingSubmissions = submissions.filter(s =>
      Object.values(s).some(v => typeof v === 'string' && v.toUpperCase().includes(b.key))
    )
    const total = matchingSubmissions.length + matchingApprovals.length
    const accepted = matchingApprovals.filter(a =>
      statusField ? classifyStatus(a[statusField]) === 'accepted' : false
    ).length
    const pct = total > 0 && accepted > 0 ? (accepted / total) * 100 : null
    return { ...b, pct, recordCount: total > 0 ? total : null, errorCount: null }
  })

  // ── Submission log table ────────────────────────────────────────────────────
  const subColumns = submissions.length > 0
    ? Object.keys(submissions[0]).filter(k => !isMetaKey(k)).slice(0, 8)
    : []

  const filteredSubs = search
    ? submissions.filter(s =>
        subColumns.some(col => String(s[col] ?? '').toLowerCase().includes(search.toLowerCase()))
      )
    : submissions

  const totalPages = Math.max(1, Math.ceil(filteredSubs.length / ROWS_PER_PAGE))
  const pageSubs = filteredSubs.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE)

  // ── Recent activity from approvals ─────────────────────────────────────────
  const recentActivity = approvals.slice(0, 5)
  const activityNameField = recentActivity.length > 0
    ? Object.keys(recentActivity[0]).find(k => /name|title|batch/i.test(k) && !isMetaKey(k))
    : null

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">

        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h13M9 17H4V5h5m0 12V5" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">BureauTrack</span>
          </div>
          <p className="text-xs text-gray-400 pl-9 leading-tight">Credit Bureau Submission Tracker</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <NavItem icon="⊞" label="Dashboard" active />
          <NavItem icon="≡" label="All Submissions" badge={kpis.total > 0 ? kpis.total : null} badgeColor="bg-blue-100 text-blue-700" />
          <NavItem icon="⚠" label="Errors / Rejects" badge={kpis.errors} badgeColor="bg-red-100 text-red-700" />
          <NavItem icon="⏱" label="Pending" badge={kpis.pending} badgeColor="bg-yellow-100 text-yellow-700" />
          <NavItem icon="✓" label="Accepted" />

          <div className="mt-4 mb-1 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Bureaus</div>
          {BUREAUS.map(b => <NavItem key={b.key} icon="🌐" label={b.label} small />)}

          <div className="mt-4 mb-1 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</div>
          <NavItem icon="📊" label="Submission Reports" small onClick={() => onNavigate('solution-tables')} />
          <NavItem icon="🔧" label="Error Resolution" small />
          <NavItem icon="📋" label="Audit Log" small />
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">RP</div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-800 truncate">Ram Prasad</div>
            <div className="text-xs text-gray-400 truncate">Data Quality Manager</div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="text-xs text-gray-400 mb-1">
            Home &rsaquo; Bureau Submissions &rsaquo; <span className="text-gray-600">Dashboard</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bureau Submission Dashboard</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Credit bureau data submissions &middot; All 4 bureaus &middot; {MONTH_LABEL} &middot; Last synced: Today, {NOW.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export
              </button>
              <button className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" /></svg>
                Upload File
              </button>
              <button className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 transition-colors font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Submission
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Loading overlay */}
          {loading && (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading dashboard data...
            </div>
          )}

          {/* ── KPI Cards ── */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Submission Health Summary — {MONTH_LABEL}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <KpiCard
                icon="📦"
                label="Total Submissions"
                value={kpis.total}
                sub="This month · All bureaus"
                badge={kpis.total > 0 ? `↑ ${kpis.total}` : null}
                badgeColor="bg-blue-50 text-blue-600"
              />
              <KpiCard
                icon="⏳"
                label="Pending / In Progress"
                value={kpis.pending ?? '—'}
                sub="Awaiting bureau ack."
                badge={kpis.pending > 0 ? `${kpis.pending} critical` : null}
                badgeColor="bg-orange-50 text-orange-600"
              />
              <KpiCard
                icon="✕"
                label="Errors / Rejected"
                value={kpis.errors ?? '—'}
                sub="Records flagged"
                badge={kpis.errors > 0 ? 'Resolve now' : null}
                badgeColor="bg-red-50 text-red-600"
              />
              <KpiCard
                icon="✓"
                label="Accepted by Bureaus"
                value={kpis.accepted ?? '—'}
                sub="Records accepted"
                badge={kpis.accepted > 0 ? `↑ ${kpis.accepted}` : null}
                badgeColor="bg-green-50 text-green-600"
              />
              <KpiCard
                icon=""
                label="Data Quality Score"
                value=""
                sub="Good · 2 pts"
                ringPct={82}
              />
            </div>
          </section>

          {/* ── Bureau Acceptance Rate ── */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Bureau-wise Acceptance Rate
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {bureauCards.map(b => (
                <BureauCard
                  key={b.key}
                  name={b.label}
                  tag={b.tag}
                  pct={b.pct}
                  recordCount={b.recordCount}
                  errorCount={b.errorCount}
                />
              ))}
            </div>
          </section>

          {/* ── Toolbar ── */}
          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors">
              <span>+</span> New Submission
            </button>
            <button className="flex items-center gap-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors">
              ↑ Upload File
            </button>
            <button className="flex items-center gap-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors">
              ✎ Resolve Errors
            </button>
            <button className="flex items-center gap-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors"
              onClick={() => onNavigate('solution-tables')}>
              ✦ View Report
            </button>
            <button className="flex items-center gap-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors">
              ↓ Export
            </button>
            <div className="flex-1 min-w-40">
              <input
                type="search"
                placeholder="Search submissions..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 bg-white"
              />
            </div>
          </div>

          {/* ── Bottom grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Submission Log */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">Submission Log</span>
                  <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                    {filteredSubs.length} submissions
                    {kpis.errors > 0 && ` · ${kpis.errors} need action`}
                  </span>
                </div>
                <a href="#" className="text-xs text-blue-600 hover:underline" onClick={e => { e.preventDefault(); onNavigate('solution-tables') }}>View all →</a>
              </div>

              {subColumns.length === 0 && !loading ? (
                <div className="px-4 py-10 text-center text-sm text-gray-400">No submission records found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="w-8 px-3 py-2"><input type="checkbox" className="rounded" /></th>
                        {subColumns.map(col => (
                          <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pageSubs.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2"><input type="checkbox" className="rounded" /></td>
                          {subColumns.map(col => (
                            <td key={col} className="px-3 py-2 text-gray-700 max-w-xs truncate whitespace-nowrap">
                              {row[col] == null ? (
                                <span className="text-gray-300">—</span>
                              ) : col === statusField ? (
                                <StatusBadge value={row[col]} />
                              ) : typeof row[col] === 'boolean' ? (
                                <span className={row[col] ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                  {row[col] ? 'Yes' : 'No'}
                                </span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, filteredSubs.length)} of {filteredSubs.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-30 hover:bg-gray-50"
                    >‹</button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-2 py-1 text-xs border rounded ${p === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
                      >{p}</button>
                    ))}
                    {totalPages > 5 && <span className="text-xs text-gray-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-30 hover:bg-gray-50"
                    >›</button>
                  </div>
                </div>
              )}
            </div>

            {/* Right panel */}
            <div className="space-y-4">

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Quick Actions</h3>
                <div className="space-y-1">
                  {[
                    { icon: '📦', title: 'New Submission', sub: 'Upload batch file' },
                    { icon: '🔧', title: 'Resolve Errors', sub: `${kpis.errors ?? 0} batches need fix` },
                    { icon: '↩', title: 'Resubmit Rejected', sub: 'CIBIL last batch' },
                    { icon: '📅', title: 'Submission Calendar', sub: 'Bureau deadlines' },
                    { icon: '📄', title: 'Generate MIS Report', sub: 'PDF / Excel' },
                  ].map(a => (
                    <button
                      key={a.title}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-base w-6 text-center">{a.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-800">{a.title}</div>
                        <div className="text-xs text-gray-400">{a.sub}</div>
                      </div>
                      <svg className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">Recent Activity</h3>
                  <span className="text-xs text-gray-400">Last 48 hrs</span>
                </div>
                {recentActivity.length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-4">No recent activity</div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((a, i) => {
                      const name = activityNameField ? String(a[activityNameField] ?? '—') : `Record ${i + 1}`
                      const stat = statusField ? a[statusField] : null
                      const cls = stat ? classifyStatus(stat) : 'other'
                      const dotColor = cls === 'accepted' ? 'bg-green-500' : cls === 'error' ? 'bg-red-500' : cls === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
                      return (
                        <div key={i} className="flex items-start gap-2">
                          <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-700 truncate">{name}</div>
                            {stat && <div className="text-xs text-gray-400">{String(stat)}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Banners ── */}
          <div className="space-y-2">
            {kpis.errors > 0 && (
              <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                <span className="text-yellow-500 text-base mt-0.5">⚠</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-yellow-800">Submission Error Alert</div>
                  <div className="text-xs text-yellow-700 mt-0.5">
                    {kpis.errors} submission{kpis.errors !== 1 ? 's' : ''} {kpis.errors !== 1 ? 'have' : 'has'} errors — resubmission required before deadline.
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a href="#" className="text-xs text-yellow-700 font-medium hover:underline" onClick={e => e.preventDefault()}>Resolve Errors →</a>
                  <a href="#" className="text-xs text-yellow-500 hover:underline" onClick={e => e.preventDefault()}>Dismiss</a>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <span className="text-blue-500 text-base mt-0.5">ℹ</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-blue-800">Data Quality Notice</div>
                <div className="text-xs text-blue-700 mt-0.5">
                  Data quality score is 82/100 — review address and PAN field completeness in your source data extract.
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a href="#" className="text-xs text-blue-700 font-medium hover:underline" onClick={e => e.preventDefault()}>View Report →</a>
                <a href="#" className="text-xs text-blue-400 hover:underline" onClick={e => e.preventDefault()}>Dismiss</a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── NavItem helper ────────────────────────────────────────────────────────────

function NavItem({ icon, label, active, badge, badgeColor, small, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors mb-0.5 ${
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } ${small ? 'text-xs' : 'text-sm'}`}
    >
      <span className="w-4 text-center text-xs shrink-0">{icon}</span>
      <span className="flex-1 truncate font-medium">{label}</span>
      {badge != null && badge !== 0 && (
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${badgeColor ?? 'bg-gray-100 text-gray-600'}`}>
          {badge}
        </span>
      )}
    </button>
  )
}
