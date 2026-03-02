import { useState, useEffect } from 'react'
import { MicrosoftDataverseService } from '../generated/services/MicrosoftDataverseService'
import { ORG_URL, SOLUTION_TABLES } from '../config'

const isMetaKey = k => k.startsWith('@') || k.startsWith('odata')

export default function SolutionTablesPage({ onNavigate }) {
  const [activeTable, setActiveTable] = useState(SOLUTION_TABLES[0])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [resolvedOrgUrl, setResolvedOrgUrl] = useState(null)

  // Resolve org URL once on mount: try GetOrganizations() (works in portal),
  // fall back to hardcoded ORG_URL (works locally via pac code run)
  useEffect(() => {
    MicrosoftDataverseService.GetOrganizations()
      .then(result => {
        const url = result.success && result.data?.value?.[0]?.Url
        setResolvedOrgUrl(url || ORG_URL)
      })
      .catch(() => setResolvedOrgUrl(ORG_URL))
  }, [])

  useEffect(() => {
    if (!resolvedOrgUrl) return
    setLoading(true)
    setError(null)
    setRecords([])

    MicrosoftDataverseService.ListRecordsWithOrganization(
      resolvedOrgUrl,
      activeTable.key,
      undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined,
      undefined, 50
    )
      .then(result => {
        if (!result.success) throw new Error(result.error?.message ?? 'Failed to load records')
        const rows = result.data?.value ?? (Array.isArray(result.data) ? result.data : [])
        setRecords(rows)
      })
      .catch(err => setError(err?.message ?? 'Unknown error'))
      .finally(() => setLoading(false))
  }, [activeTable, resolvedOrgUrl])

  const columns = records.length > 0
    ? Object.keys(records[0]).filter(k => !isMetaKey(k))
    : []

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">

      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => onNavigate('home')}
          className="text-gray-400 hover:text-white transition-colors"
          title="Back to home"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white leading-tight">Solution Tables</h1>
          <p className="text-xs text-gray-500">RegulatorySubmissionsHub</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 flex gap-1">
        {SOLUTION_TABLES.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTable(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTable.key === t.key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading {activeTable.label} records...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 text-red-300 px-4 py-3 text-sm">
            <span className="font-medium">Error: </span>{error}
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <>
            <p className="text-xs text-gray-500 mb-3">
              {records.length} record{records.length !== 1 ? 's' : ''} · <code className="text-yellow-400">{activeTable.key}</code>
            </p>

            {records.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-sm">No records found in {activeTable.label}</div>
            ) : (
              <div className="rounded-lg border border-gray-800 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider">
                    <tr>
                      {columns.map(col => (
                        <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {records.map((row, i) => (
                      <tr key={i} className="bg-gray-900/40 hover:bg-gray-800/60 transition-colors">
                        {columns.map(col => (
                          <td key={col} className="px-3 py-2 text-gray-300 max-w-xs truncate whitespace-nowrap">
                            {row[col] == null ? (
                              <span className="text-gray-600">—</span>
                            ) : typeof row[col] === 'boolean' ? (
                              <span className={row[col] ? 'text-green-400' : 'text-gray-500'}>
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
          </>
        )}
      </div>
    </div>
  )
}
