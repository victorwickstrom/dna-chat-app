import { useMemo } from 'react'
import { useGlobalContext } from '../context/AppContext'

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const DNASummary = () => {
  const { metadata } = useGlobalContext()

  const summary = useMemo(() => {
    if (!metadata) {
      return null
    }
    return {
      vendor: metadata.vendor || 'Okänd leverantör',
      fileName: metadata.fileName,
      count: metadata.count.toLocaleString('sv-SE'),
      uploadDate: formatDate(metadata.uploadDate),
      hash: metadata.hash.slice(0, 10),
    }
  }, [metadata])

  if (!summary) {
    return null
  }

  return (
    <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Senaste DNA-index</p>
          <p className="text-lg font-semibold text-slate-900">{summary.vendor}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
          {summary.count} SNP
        </span>
      </header>
      <dl className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Filnamn</dt>
          <dd className="truncate font-medium text-slate-900">{summary.fileName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Uppladdad</dt>
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
