import { useState } from 'react'
import { Download, ChevronDown, FileText, Table } from 'lucide-react'

interface ExportButtonProps {
  data: Record<string, any>[]
  filename?: string
  title?: string
  headers?: string[] | Record<string, string>
  label?: string
}

/**
 * Bouton d'export CSV + impression — fonctionne sans dépendances externes.
 */
export default function ExportButton({
  data,
  filename = 'export',
  title = 'Export',
  headers,
  label = 'Exporter',
}: ExportButtonProps) {
  const [open, setOpen] = useState(false)

  const getKeys = () => {
    if (!headers) return Object.keys(data[0])
    return Array.isArray(headers) ? headers : Object.keys(headers)
  }

  const getDisplayKeys = () => {
    if (!headers) return Object.keys(data[0])
    if (Array.isArray(headers)) return headers
    return Object.values(headers)
  }

  const exportCSV = () => {
    if (data.length === 0) { alert('Aucune donnée à exporter.'); return }
    const keys = getKeys()
    const displayKeys = getDisplayKeys()
    const rows = data.map(row =>
      keys.map(k => {
        const val = row[k] ?? ''
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
        return `"${str.replace(/"/g, '""')}"`
      }).join(',')
    )
    const csv = [displayKeys.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    setOpen(false)
  }

  const printTable = () => {
    if (data.length === 0) { alert('Aucune donnée à imprimer.'); return }
    const keys = getKeys()
    const displayKeys = getDisplayKeys()
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) { alert('Autorisez les popups pour imprimer.'); return }
    win.document.write(`
      <html><head><title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #1f2937; }
        h1 { color: #1E3A8A; font-size: 20px; margin-bottom: 4px; }
        p { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1E3A8A; color: white; padding: 8px 12px; text-align: left; font-weight: 600; }
        td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background: #f8fafc; }
        footer { margin-top: 32px; font-size: 10px; color: #9ca3af; }
      </style></head><body>
      <h1>ALBA SERVICE GROUP</h1>
      <p>${title} — Kindu, Province du Maniema, R.D. Congo — ${new Date().toLocaleDateString('fr-FR')}</p>
      <table>
        <thead><tr>${displayKeys.map(k => `<th>${k}</th>`).join('')}</tr></thead>
        <tbody>
          ${data.map(row =>
            `<tr>${keys.map(k => {
              const v = row[k] ?? ''
              return `<td>${typeof v === 'object' ? JSON.stringify(v) : v}</td>`
            }).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
      <footer>© 2026 ALBA SERVICE GROUP — Document généré automatiquement</footer>
      </body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
        <Download size={15} />
        {label}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
            <button
              onClick={exportCSV}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <Table size={14} className="text-green-600" />
              Exporter CSV
            </button>
            <button
              onClick={printTable}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-50">
              <FileText size={14} className="text-blue-600" />
              Imprimer / PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
