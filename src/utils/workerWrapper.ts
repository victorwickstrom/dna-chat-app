import type { Metadata } from '../context/AppContext'

export interface ParseResult {
  index: Map<string, string | null>
  metadata: Metadata
}

type WorkerEvent =
  | { type: 'progress'; value: number }
  | { type: 'result'; index: [string, string | null][]; metadata: Metadata }
  | { type: 'error'; message: string }

export const parseDNA = (
  file: File,
  onProgress?: (progress: number) => void
): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/parseDNA.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      const message = event.data
      if (!message) return

      switch (message.type) {
        case 'progress':
          onProgress?.(message.value)
          break
        case 'result':
          resolve({ index: new Map(message.index), metadata: message.metadata })
          worker.terminate()
          break
        case 'error':
          reject(new Error(message.message))
          worker.terminate()
          break
        default:
          break
      }
    }

    worker.onerror = (error) => {
      worker.terminate()
      reject(error)
    }

    worker.postMessage({ file })
  })
}
