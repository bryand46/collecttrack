import * as XLSX from 'xlsx'

export type ExportItem = {
  id: string
  name: string
  category: string
  manufacturer: string | null
  edition: string | null
  condition: string
  paidPrice: number | null
  estimatedValue: number | null
  notes: string | null
  imageUrl: string | null
  acquiredAt: string | null
  createdAt: string
}

type ExportFormat = 'xlsx' | 'csv' | 'json'

function toRows(items: ExportItem[]) {
  return items.map((item) => ({
    Name: item.name,
    Category: item.category,
    Manufacturer: item.manufacturer ?? '',
    Edition: item.edition ?? '',
    Condition: item.condition,
    'Paid Price': item.paidPrice ?? '',
    'Estimated Value': item.estimatedValue ?? '',
    'Acquired Date': item.acquiredAt ? new Date(item.acquiredAt).toLocaleDateString() : '',
    Notes: item.notes ?? '',
    'Date Added': new Date(item.createdAt).toLocaleDateString(),
  }))
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportAsXlsx(items: ExportItem[], filename: string) {
  const rows = toRows(items)
  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 30 }, // Name
    { wch: 24 }, // Category
    { wch: 20 }, // Manufacturer
    { wch: 18 }, // Edition
    { wch: 14 }, // Condition
    { wch: 12 }, // Paid Price
    { wch: 16 }, // Estimated Value
    { wch: 16 }, // Acquired Date
    { wch: 30 }, // Notes
    { wch: 14 }, // Date Added
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Collection')

  // Summary sheet
  const totalPaid = items.reduce((s, i) => s + Number(i.paidPrice ?? 0), 0)
  const totalValue = items.reduce((s, i) => s + Number(i.estimatedValue ?? 0), 0)
  const gain = totalValue - totalPaid

  const categoryCounts: Record<string, { count: number; value: number }> = {}
  items.forEach((i) => {
    if (!categoryCounts[i.category]) categoryCounts[i.category] = { count: 0, value: 0 }
    categoryCounts[i.category].count++
    categoryCounts[i.category].value += Number(i.estimatedValue ?? 0)
  })

  const summaryRows = [
    { Metric: 'Total Items', Value: items.length },
    { Metric: 'Total Paid', Value: totalPaid },
    { Metric: 'Total Estimated Value', Value: totalValue },
    { Metric: 'Total Gain / Loss', Value: gain },
    { Metric: '', Value: '' },
    { Metric: 'Category', Value: 'Items' },
    ...Object.entries(categoryCounts).map(([cat, d]) => ({
      Metric: cat,
      Value: d.count,
    })),
  ]

  const ws2 = XLSX.utils.json_to_sheet(summaryRows)
  ws2['!cols'] = [{ wch: 28 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  triggerDownload(new Blob([buf], { type: 'application/octet-stream' }), filename)
}

function exportAsCsv(items: ExportItem[], filename: string) {
  const rows = toRows(items)
  const headers = Object.keys(rows[0] ?? {})
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape((row as Record<string, unknown>)[h])).join(',')),
  ]
  triggerDownload(
    new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' }),
    filename
  )
}

function exportAsJson(items: ExportItem[], filename: string) {
  const data = {
    exportedAt: new Date().toISOString(),
    totalItems: items.length,
    items,
  }
  triggerDownload(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    filename
  )
}

export function exportCollection(items: ExportItem[], format: ExportFormat) {
  const date = new Date().toISOString().split('T')[0]
  const base = `collecttrack-export-${date}`

  switch (format) {
    case 'xlsx': return exportAsXlsx(items, `${base}.xlsx`)
    case 'csv':  return exportAsCsv(items, `${base}.csv`)
    case 'json': return exportAsJson(items, `${base}.json`)
  }
}
