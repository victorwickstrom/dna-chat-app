/// <reference lib="webworker" />
import { readFileAsLines } from '../utils/decompress'
import { computeHash } from '../utils/hash'
import { normalizeGenotype } from '../utils/normalize'
import { detectVendor, type VendorCode } from '../utils/vendor'

type WorkerRequest = {
  file: File
}

type ProgressMessage = {
  type: 'progress'
  value: number
}

type ResultMessage = {
  type: 'result'
  index: [string, string | null][]
  metadata: {
    vendor: VendorCode
    count: number
    fileName: string
    uploadDate: string
    hash: string
  }
}

type ErrorMessage = {
  type: 'error'
  message: string
}

const postProgress = (value: number) => {
  ;(self as DedicatedWorkerGlobalScope).postMessage({
    type: 'progress',
    value,
  } satisfies ProgressMessage)
}

const postResult = (payload: ResultMessage['index'], metadata: ResultMessage['metadata']) => {
  ;(self as DedicatedWorkerGlobalScope).postMessage({
    type: 'result',
    index: payload,
    metadata,
  } satisfies ResultMessage)
}

const postError = (message: string) => {
  ;(self as DedicatedWorkerGlobalScope).postMessage({
    type: 'error',
    message,
  } satisfies ErrorMessage)
}

const extractGenotype = (columns: string[], vendor: VendorCode): string | null => {
  if (columns.length === 0) return null
  if (vendor === 'ancestry') {
    const genotype = columns[3] ?? columns[4] ?? ''
    return genotype.replace(/[^A-Za-z-]/g, '')
  }

  const genotype = columns[3] ?? columns[4] ?? columns[columns.length - 1]
  return genotype.trim()
}

const CHUNK_SIZE = 50000
const PROGRESS_INTERVAL = 1

const parseLines = async (
  lines: string[],
  vendor: VendorCode
): Promise<Map<string, string | null>> => {
  const index = new Map<string, string | null>()
  const total = lines.length || 1
  let processed = 0
  let lastReported = 0

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line || line.startsWith('#')) {
      continue
    }

    const normalizedLine = line.replace(/,/g, '\t')
    const rawColumns = normalizedLine.split(/\s+/)
    const columns = rawColumns.map((value) => value.replace(/(^"|"$)/g, ''))
    if (columns.length < 2) {
      continue
    }

    const rsid = columns[0]
    if (!rsid.startsWith('rs')) {
      continue
    }

    const genotypeRaw = extractGenotype(columns, vendor)
    let genotype = genotypeRaw
    if (genotype === '--' || genotype === '00' || genotype === '') {
      genotype = null
    }

    const normalized = normalizeGenotype(genotype)
    index.set(rsid, normalized)

    processed += 1

    if (i % CHUNK_SIZE === 0 && i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    const currentProgress = Math.min(99, (processed / total) * 100)
    if (currentProgress - lastReported >= PROGRESS_INTERVAL || processed === total) {
      lastReported = currentProgress
      postProgress(Math.round(currentProgress))
    }
  }

  return index
}

const handleMessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    const { file } = event.data
    if (!file) {
      postError('No file provided to worker.')
      return
    }

    postProgress(1)
    const hash = await computeHash(file)

    postProgress(5)
    const lines = await readFileAsLines(file)
    const vendor = detectVendor(lines.slice(0, 50))

    postProgress(15)
    const index = await parseLines(lines, vendor)
    console.log('Worker parsed', index.size, 'SNPs for vendor', vendor)

    const metadata: ResultMessage['metadata'] = {
      vendor,
      count: index.size,
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      hash,
    }

    postProgress(100)
    postResult(Array.from(index.entries()), metadata)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown worker error'
    postError(message)
  }
}

;(self as DedicatedWorkerGlobalScope).onmessage = handleMessage

export {}
