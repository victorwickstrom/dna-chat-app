import type { MatchResult } from '../models/MatchResult'

interface GenotypeConsentDialogProps {
  matchResult: MatchResult
  onConfirm: () => void
  onCancel: () => void
}

export const GenotypeConsentDialog = ({
  matchResult,
  onConfirm,
  onCancel,
}: GenotypeConsentDialogProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Bekräfta utskick av genotyper</h2>
        <p className="mb-4 text-sm text-slate-600">
          Följande SNP-genotyper kommer att skickas till tolkaren för att besvara din fråga:
        </p>
        <div className="mb-4 max-h-48 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-300">
                <th className="px-2 py-1 text-left">rsid</th>
                <th className="px-2 py-1 text-left">genotype</th>
                <th className="px-2 py-1 text-left">evidence</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(matchResult).map(([rsid, value]) => (
                <tr key={rsid} className="border-b border-slate-200">
                  <td className="px-2 py-1 font-mono">{rsid}</td>
                  <td className="px-2 py-1 font-mono">{value.genotype ?? 'null'}</td>
                  <td className="px-2 py-1">{value.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Avbryt
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Skicka
          </button>
        </div>
      </div>
    </div>
  )
}
