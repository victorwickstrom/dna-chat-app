import { useMemo } from 'react'
import { useGlobalContext } from '../context/AppContext'

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

interface DNASummaryProps {
  compact?: boolean
}

const DNASummary = ({ compact = false }: DNASummaryProps) => {
  const { metadata } = useGlobalContext()

  const summary = useMemo(() => {
    if (!metadata) {
      return null
    }
    return {
      vendor: metadata.vendor || 'Unknown vendor',
      fileName: metadata.fileName,
      count: metadata.count.toLocaleString('en-US'),
      uploadDate: formatDate(metadata.uploadDate),
      hash: metadata.hash.slice(0, 10),
    }
  }, [metadata])

  if (!summary) {
    return compact ? (
      <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs text-slate-400">No DNA data loaded</p>
      </div>
    ) : null
  }

  if (compact) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧬</span>
            <div>
              <p className="text-xs text-slate-500">DNA Data</p>
              <p className="text-sm font-semibold text-slate-900">{summary.vendor}</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
            {summary.count} SNP
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span className="truncate max-w-[120px]" title={summary.fileName}>{summary.fileName}</span>
          <span>•</span>
          <span>{summary.uploadDate}</span>
        </div>
      </div>
    )
  }

  return (
    <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Latest DNA Index</p>
          <p className="text-lg font-semibold text-slate-900">{summary.vendor}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
          {summary.count} SNP
        </span>
      </header>
      <dl className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Filename</dt>
          <dd className="truncate font-medium text-slate-900">{summary.fileName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Uploaded</dt>
          <dd className="font-medium text-slate-900">{summary.uploadDate}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Hash</dt>
          <dd className="font-mono text-xs text-slate-900">{summary.hash}…</dd>
        </div>
      </dl>
    </section>
  )
}

export default DNASummary
