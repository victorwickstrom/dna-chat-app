import JSZip from 'jszip'
import pako from 'pako'

const splitLines = (text: string) => text.split(/\r?\n/)

export const decompressZip = async (file: File): Promise<string[]> => {
  const zip = await JSZip.loadAsync(file)
  const names = Object.keys(zip.files)
  const txtEntry = names.find((name) => name.toLowerCase().endsWith('.txt'))
  const csvEntry = names.find((name) => name.toLowerCase().endsWith('.csv'))
  const entryName = txtEntry ?? csvEntry
  if (!entryName) {
    throw new Error('Zip archive does not contain a supported DNA file (.txt or .csv).')
  }

  const contents = await zip.files[entryName].async('string')
  return splitLines(contents)
}

export const decompressGzip = async (buffer: ArrayBuffer): Promise<string[]> => {
  const decompressed = pako.ungzip(new Uint8Array(buffer), { to: 'string' })
  const text =
    typeof decompressed === 'string'
      ? decompressed
      : new TextDecoder().decode(decompressed as Uint8Array)
  return splitLines(text)
}

export const readFileAsLines = async (file: File): Promise<string[]> => {
  const lower = file.name.toLowerCase()

  if (lower.endsWith('.zip')) {
    return decompressZip(file)
  }

  if (lower.endsWith('.gz')) {
    const buffer = await file.arrayBuffer()
    return decompressGzip(buffer)
  }

  const text = await file.text()
  return splitLines(text)
}
