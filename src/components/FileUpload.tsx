import { useRef, useState } from 'react'
import { useGlobalContext } from '../context/AppContext'
import { clearData, loadSNPIndex, saveSNPIndex } from '../storage'
import { computeHash } from '../utils/hash'
import { parseDNA } from '../utils/workerWrapper'
import { runDnaAnalysis } from '../dna/DnaAnalysisController'
import { dnaState } from '../dna/dnaState'

interface FileUploadProps {
  compact?: boolean
}

const FileUpload = ({ compact = false }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { setMetadata, setSnpIndex } = useGlobalContext()

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const lower = file.name.toLowerCase()
    const isValid = ['.txt', '.zip', '.gz'].some((ext) => lower.endsWith(ext))
    if (!isValid) {
      setError('Only .txt, .zip or .gz files are supported.')
      setStatus(null)
      setProgress(0)
      return
    }

    try {
      setError(null)
      setStatus('Analyzing file...')
      setProgress(0)

      const [hash, stored] = await Promise.all([computeHash(file), loadSNPIndex()])
      // Force re-parse if cached index has 0 SNPs (likely a parsing bug was fixed)
      if (stored.metadata && stored.metadata.hash === hash && stored.metadata.count > 0) {
        setSnpIndex(stored.index)
        setMetadata(stored.metadata)
        setProgress(100)
        setStatus('DNA file already processed. Loaded cached index.')
        
        // Trigger analysis with cached rsids AND snpIndex (for primary matching)
        const rsids = stored.index ? Array.from(stored.index.keys()) : []
        if (rsids.length > 0 && stored.index) {
          setAnalysisStatus('Analyzing genetic data...')
          console.log('[FileUpload] Starting analysis from cache for', rsids.length, 'rsids')
          await runDnaAnalysis(rsids, stored.index)
          console.log('[FileUpload] Analysis status after cached run:', dnaState.status)
          setAnalysisStatus(dnaState.snpMatchResult ? 'Analysis complete!' : null)
        }
        return
      }

      setStatus('Parsing DNA file...')
      dnaState.status = 'parsing'
      const result = await parseDNA(file, (value) => setProgress(value))
      setSnpIndex(result.index)
      setMetadata(result.metadata)
      await saveSNPIndex(result.index, result.metadata)
      setStatus('Upload complete')

      // Automatically trigger analysis after parsing - pass snpIndex for primary matching
      const rsids = result.index ? Array.from(result.index.keys()) : []
      if (rsids.length > 0 && result.index) {
        setAnalysisStatus('Analyzing genetic data...')
        console.log('[FileUpload] Starting analysis from parsed file for', rsids.length, 'rsids')
        await runDnaAnalysis(rsids, result.index)
        console.log('[FileUpload] Analysis status after parsed run:', dnaState.status)
        setAnalysisStatus(dnaState.snpMatchResult ? 'Analysis complete!' : null)
      }
    } catch (error) {
      console.error(error)
      setStatus(null)
      setProgress(0)
      setError('Could not parse DNA file. Check the format and try again.')
    }
  }

  const handleClear = async () => {
    const confirmed = window.confirm('This will remove all DNA data from your browser. Continue?')
    if (!confirmed) return
    await clearData()
    setSnpIndex(null)
    setMetadata(null as never)
    setProgress(0)
    setStatus('Local DNA data cleared.')
  }

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    handleFiles(event.dataTransfer.files)
  }

  const preventDefault = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
  }

  return (
    <div className={`rounded-lg border border-dashed border-slate-300 bg-white shadow-sm ${compact ? 'p-3' : 'w-full max-w-2xl p-6'}`}>
      <label
        htmlFor="dna-file"
        onDragOver={preventDefault}
        onDragEnter={preventDefault}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-center transition hover:border-blue-400 hover:bg-slate-100 ${compact ? 'h-20 gap-1 p-2' : 'h-40 p-4'}`}
      >
        <p className={`font-medium text-slate-800 ${compact ? 'text-sm' : 'text-base'}`}>
          {compact ? '📁 Drop DNA file here' : 'Drop your DNA file here'}
        </p>
        {!compact && (
          <p className="text-sm text-slate-500">
            Supports .txt, .zip and .gz (23andMe, MyHeritage, AncestryDNA)
          </p>
        )}
        <p className={`rounded bg-blue-600 font-semibold text-white ${compact ? 'mt-1 px-3 py-0.5 text-xs' : 'mt-4 px-4 py-1 text-sm'}`}>
          Choose file
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
        <div className={`space-y-1 ${compact ? 'mt-2' : 'mt-4 space-y-2'}`}>
          <div className={`flex justify-between text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>
            <span>{progress === 100 ? '✓' : 'Parsing...'}</span>
            <span>{progress}%</span>
          </div>
          <div className={`w-full rounded-full bg-slate-200 ${compact ? 'h-1' : 'h-2'}`}>
            <div
              className={`rounded-full bg-blue-500 transition-all ${compact ? 'h-1' : 'h-2'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status && <p className={`text-slate-600 ${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'}`}>{status}</p>}
      {analysisStatus && <p className={`text-green-600 ${compact ? 'text-xs' : 'mt-1 text-sm'}`}>{analysisStatus}</p>}
      {error && <p className={`text-red-600 ${compact ? 'text-xs' : 'mt-1 text-sm'}`}>{error}</p>}

      {!compact && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-4 text-sm font-medium text-red-600 hover:underline"
        >
          Clear stored DNA data
        </button>
      )}
    </div>
  )
}

export default FileUpload
