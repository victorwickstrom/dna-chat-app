import { decompressGzip } from '../utils/decompress'
import pako from 'pako'

describe('decompress utilities', () => {
  describe('decompressGzip', () => {
    it('should decompress gzipped content and return lines', async () => {
      const testContent = 'line1\nline2\nline3'
      const compressed = pako.gzip(testContent)
      const buffer = compressed.buffer.slice(
        compressed.byteOffset,
        compressed.byteOffset + compressed.byteLength
      )

      const result = await decompressGzip(buffer)

      expect(result).toEqual(['line1', 'line2', 'line3'])
    })

    it('should handle Windows line endings', async () => {
      const testContent = 'line1\r\nline2\r\nline3'
      const compressed = pako.gzip(testContent)
      const buffer = compressed.buffer.slice(
        compressed.byteOffset,
        compressed.byteOffset + compressed.byteLength
      )

      const result = await decompressGzip(buffer)

      expect(result).toEqual(['line1', 'line2', 'line3'])
    })

    it('should handle empty content', async () => {
      const testContent = ''
      const compressed = pako.gzip(testContent)
      const buffer = compressed.buffer.slice(
        compressed.byteOffset,
        compressed.byteOffset + compressed.byteLength
      )

      const result = await decompressGzip(buffer)

      expect(result).toEqual([''])
    })
  })
})
