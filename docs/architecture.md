# System Architecture

## Overview

DNA Chat Assistant is a privacy-first browser application that enables users to explore their genetic data through natural language questions. The architecture ensures that raw DNA data never leaves the user's device.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  React App   │  │  Web Worker  │  │     IndexedDB        │  │
│  │  - Chat      │  │  - Parser    │  │  - SNP Index         │  │
│  │  - Settings  │  │  - Decomp    │  │  - Preferences       │  │
│  │  - Memory    │  │              │  │  - Topic Weights     │  │
│  └──────────────┘  └──────────────┘  │  - Knowledge Graph   │  │
│         │                 │          │  - Summaries         │  │
│         └────────────────┬┘          └──────────────────────┘  │
│                          │                      │               │
│                     Minimal Data                │               │
│                     (rsid + genotype)           │               │
└─────────────────────────│───────────────────────┘               │
                          │
                          ▼
              ┌───────────────────────┐
              │    LLM Services       │
              │  - Planner            │
              │  - Interpreter        │
              └───────────────────────┘
```

## Client Components

### Core Components

- **`App.tsx`** - Main application shell with header, language switcher, and settings modal
- **`Chat.tsx`** - Chat interface handling user input, message display, and LLM communication
- **`FileUpload.tsx`** - Drag-and-drop DNA file upload with progress reporting
- **`DNASummary.tsx`** - Displays loaded DNA file metadata (vendor, SNP count)
- **`Settings.tsx`** - Modal with tabs for preferences, memory, and privacy

### UI Components

- **`Preferences.tsx`** - User preference controls (explanation level, tone, language)
- **`MemoryOverview.tsx`** - Displays and edits topic weights, knowledge graph, summaries
- **`Privacy.tsx`** - Privacy policy and data handling information
- **`LanguageSwitcher.tsx`** - Language toggle (Swedish/English)
- **`ErrorBoundary.tsx`** - Catches React errors and displays fallback UI

### State Management

The app uses React Context (`GlobalProvider` in `context/AppContext.tsx`) for global state:

```typescript
interface GlobalContext {
  snpIndex: Map<string, string | null> | null
  preferences: Preferences
  topicWeights: Record<string, number>
  knowledgeGraph: Record<string, number>
  // ... setters
}
```

## DNA Parsing Pipeline

### File Processing Flow

1. **File Selection** - User drops or selects a DNA file (.txt, .zip, .gz)
2. **Web Worker** - File is sent to `parseDNA.ts` worker for background processing
3. **Decompression** - `decompress.ts` handles ZIP and GZIP formats
4. **Vendor Detection** - `vendor.ts` identifies 23andMe, Ancestry, or MyHeritage format
5. **Line Parsing** - Extract rsID and genotype from each line
6. **Normalization** - `normalize.ts` sorts alleles (e.g., "TA" → "AT")
7. **Progress Reporting** - Worker posts progress updates to main thread
8. **Storage** - Final index stored in IndexedDB via `storage/index.ts`

### Key Files

- `src/workers/parseDNA.ts` - Web Worker entry point
- `src/utils/decompress.ts` - ZIP/GZIP decompression
- `src/utils/vendor.ts` - Vendor detection logic
- `src/utils/normalize.ts` - Genotype normalization
- `src/utils/parser.ts` - Line parsing functions

## LLM Integration

### Two-Step Process

```
User Question
     │
     ▼
┌─────────────┐     QueryPlan JSON
│   Planner   │ ──────────────────►  Local SNP
│   (LLM)     │                      Matching
└─────────────┘                         │
                                        │ MatchResult
                                        ▼
                              ┌─────────────────┐
                              │   Interpreter   │
                              │     (LLM)       │
                              └─────────────────┘
                                        │
                                        ▼
                              InterpreterResponse JSON
```

### Step 1: Query Planning

- **Input**: User question + preferences + memory context
- **Output**: `QueryPlan` JSON with required SNPs
- **Files**: `src/utils/planner.ts`, `src/models/queryPlan.ts`

### Step 2: Interpretation

- **Input**: Question + QueryPlan + MatchResult (genotypes) + preferences
- **Output**: `InterpreterResponse` JSON with answer, key points, uncertainty
- **Files**: `src/utils/interpreter.ts`, `src/models/interpreter.ts`

### Safety Checks

Before LLM calls, the safety classifier (`src/utils/safety.ts`) checks for:

- **PII** - Email, phone numbers, identification numbers
- **Diagnostic** - "Do I have X?" type questions
- **Prescriptive** - "Should I take X?" type questions

## Local Memory System

### IndexedDB Stores

| Store                   | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `snpIndex`              | Parsed DNA data (rsID → genotype map)    |
| `metadata`              | File info (vendor, filename, hash, date) |
| `preferences`           | User settings (language, tone, etc.)     |
| `topicWeights`          | Interest tracking per topic              |
| `knowledgeGraph`        | Entity mention counts                    |
| `conversationSummaries` | Past conversation summaries              |

### Learning User Interests

1. After each query, the topic from `QueryPlan` increments in `topicWeights`
2. Genes and SNPs mentioned in responses update `knowledgeGraph`
3. Top topics are included in future planner prompts for personalization

### Memory Functions

```typescript
// Topic weights
incrementTopicWeight(topic: string, delta?: number)
getTopThreeTopics(): Promise<Record<string, number>>

// Knowledge graph
incrementKnowledgeGraph(key: string, delta?: number)

// Export/Import
exportMemory(): Promise<void>  // Downloads JSON
importMemory(file: File): Promise<void>  // Restores from JSON

// Reset
resetMemory(includePreferences?: boolean): Promise<void>
```

## Privacy & Security

### Data Flow Principles

1. **Raw DNA stays local** - Never uploaded to any server
2. **Minimal data sent** - Only specific rsIDs and genotypes needed for the question
3. **User consent** - Confirmation dialog before sending genotypes (unless auto-send enabled)
4. **Local storage** - All preferences and history in browser IndexedDB
5. **Export control** - User can export/delete their data anytime

### Safety Classifier

The classifier blocks questions that:

- Contain personally identifiable information
- Request medical diagnoses
- Ask for treatment/medication advice

## Internationalization

The app supports Swedish (default) and English via i18next:

- `src/i18n.ts` - i18next configuration
- `src/locales/sv/translation.json` - Swedish translations
- `src/locales/en/translation.json` - English translations

Language preference is saved to IndexedDB and synced with i18next on load.

## Testing

Test files are in `src/tests/`:

- Unit tests for utilities (parser, normalize, vendor, safety)
- Component tests with React Testing Library
- Integration tests for end-to-end flows

Run with: `npm test`
