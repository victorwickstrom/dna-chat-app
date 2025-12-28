### Task 26: Implement IndexedDB storage for SNP index.

1. In `src/storage/index.ts`, import `openDB` from `idb`:
   ```ts
   import { openDB, IDBPDatabase } from 'idb'
   ```
2. Define types:
   ```ts
   interface SNPRecord {
     id: string
     genotype: string | null
   }
   interface Metadata {
     vendor: string
     fileName: string
     count: number
     hash: string
     uploadDate: string
   }
   ```
3. Open (or create) a database called `dnaDb` with version 1 and stores: `snpIndex` (key: `id`, value: genotype) and `metadata` (key: `id`, value: metadata):
   ```ts
   let dbPromise: Promise<IDBPDatabase<any>>
   function getDb() {
     if (!dbPromise) {
       dbPromise = openDB('dnaDb', 1, {
         upgrade(db) {
           db.createObjectStore('snpIndex')
           db.createObjectStore('metadata')
         },
       })
     }
     return dbPromise
   }
   ```
4. Implement `async function saveSNPIndex(index: Map<string, string | null>, metadata: Metadata): Promise<void>`:
   - Clear existing records using `clear()` on the `snpIndex` store.
   - Iterate over `index.entries()` and put each genotype value keyed by `rsid`.
   - Store metadata with key `'current'` in the `metadata` store.
5. Implement `async function loadSNPIndex(): Promise<{ index: Map<string, string | null>, metadata: Metadata | null }>`:
   - Get metadata with key `'current'` from the `metadata` store. If none, return `{ index: new Map(), metadata: null }`.
   - Use a cursor or `getAll()` to retrieve all genotypes and populate a new `Map`.
6. Implement `async function clearData()`: clear both stores.
7. Export these functions for use in context or file upload.
