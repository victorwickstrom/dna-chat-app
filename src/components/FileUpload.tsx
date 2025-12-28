import { useRef, useState } from 'react'
import { useGlobalContext } from '../context/AppContext'
import { clearData, loadSNPIndex, saveSNPIndex } from '../storage'
import { computeHash } from '../utils/hash'
import { parseDNA } from '../utils/workerWrapper'

const FileUpload = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { setMetadata, setSnpIndex } = useGlobalContext()

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const lower = file.name.toLowerCase()
    const isValid = ['.txt', '.zip', '.gz'].some((ext) => lower.endsWith(ext))
    if (!isValid) {
      setError('Endast .txt, .zip eller .gz-filer stöds.')
      setStatus(null)
      setProgress(0)
      return
    }

    try {
      setError(null)
      setStatus('Analyserar fil...')
      setProgress(0)

      const [hash, stored] = await Promise.all([computeHash(file), loadSNPIndex()])
      // Force re-parse if cached index has 0 SNPs (likely a parsing bug was fixed)
      if (stored.metadata && stored.metadata.hash === hash && stored.metadata.count > 0) {
        setSnpIndex(stored.index)
        setMetadata(stored.metadata)
        setProgress(100)
        setStatus('DNA-fil redan bearbetad. Laddade cachelagrat index.')
        return
      }

      setStatus('Parserar DNA-fil...')
      const result = await parseDNA(file, (value) => setProgress(value))
      setSnpIndex(result.index)
      setMetadata(result.metadata)
      await saveSNPIndex(result.index, result.metadata)
      setStatus('Upload complete')
    } catch (error) {
      console.error(error)
      setStatus(null)
      setProgress(0)
      setError('Kunde inte tolka DNA-filen. Kontrollera formatet och försök igen.')
    }
  }

  const handleClear = async () => {
    const confirmed = window.confirm('Detta tar bort allt DNA-data från din webbläsare. Fortsätt?')
    if (!confirmed) return
    await clearData()
    setSnpIndex(null)
    setMetadata(null as never)
    setProgress(0)
    setStatus('Lokalt DNA-data raderat.')
  }

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    handleFiles(event.dataTransfer.files)
  }

  const preventDefault = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
  }

  return (
    <div className="w-full max-w-2xl rounded-lg border border-dashed border-slate-300 bg-white p-6 shadow-sm">
      <label
        htmlFor="dna-file"
        onDragOver={preventDefault}
        onDragEnter={preventDefault}
        onDrop={handleDrop}
        className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-center transition hover:border-blue-400 hover:bg-slate-100"
      >
        <p className="text-base font-medium text-slate-800">Släpp din DNA-fil här</p>
        <p className="text-sm text-slate-500">
          Stödjer .txt, .zip och .gz (23andMe, MyHeritage, AncestryDNA)
        </p>
        <p className="mt-4 rounded bg-blue-600 px-4 py-1 text-sm font-semibold text-white">
          Välj fil
        </p>
        <input
          id="dna-file"
          ref={fileInputRef}
          type="file"
          accept=".txt,.zip,.gz"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </label>

      {progress > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Parsing progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleClear}
        className="mt-4 text-sm font-medium text-red-600 hover:underline"
      >
        Rensa lagrat DNA-data
      </button>
    </div>
  )
}

export default FileUpload
