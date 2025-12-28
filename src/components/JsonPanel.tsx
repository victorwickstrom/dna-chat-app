interface JsonPanelProps {
  title: string
  json: object | string
}

export const JsonPanel = ({ title, json }: JsonPanelProps) => {
  const formatted = typeof json === 'string' ? json : JSON.stringify(json, null, 2)

  return (
    <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
        {title}
      </summary>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-600">
        {formatted}
      </pre>
      <p className="mt-2 text-xs text-slate-500">Denna data skickades till LLM för transparens.</p>
    </details>
  )
}
