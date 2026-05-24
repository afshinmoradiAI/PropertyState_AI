'use client'
import { useState } from 'react'
import { PropertyReport } from '../types/property'

interface Props { report: PropertyReport }

export default function DownloadReportButton({ report }: Props) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const [{ pdf }, { default: ReportPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ReportPDF'),
      ])
      const blob = await pdf(<ReportPDF report={report} />).toBlob()
      const url = URL.createObjectURL(blob)
      const filename = `PropertyState-${report.property.suburb.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation failed', err)
      alert('Could not generate PDF: ' + (err instanceof Error ? err.message : 'unknown error'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex items-center gap-2 rounded-xl py-2.5 px-4 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: 'linear-gradient(135deg, #1B3A6B, #D4AF37)' }}
    >
      {downloading ? (
        <>
          <span className="animate-pulse">Generating PDF…</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
          Download PDF Report
        </>
      )}
    </button>
  )
}
