# Local Memory Model

DNA Chat Assistant uses a local memory system stored in IndexedDB to personalize the experience and remember user preferences across sessions.

## Memory Stores

### Preferences

Stores user settings that control how the application behaves and responds.

| Setting             | Description                    | Options                         |
| ------------------- | ------------------------------ | ------------------------------- |
| `explanationLevel`  | Detail level of explanations   | `layman`, `normal`, `technical` |
| `tone`              | Response style                 | `calm`, `formal`                |
| `showUncertainty`   | Display uncertainty indicators | `true`, `false`                 |
| `language`          | Interface language             | `sv` (Swedish), `en` (English)  |
| `autoSendGenotypes` | Skip confirmation dialog       | `true`, `false`                 |

**How it's used**: Preferences are included in both Planner and Interpreter prompts to customize response style. The language setting also controls i18next and UI labels.

### Topic Weights

Tracks the user's interest in various genetic topics over time.

```typescript
{
  "inflammation": 5,
  "metabolism": 3,
  "neurodiversity": 2,
  "cardiovascular": 1
}
```

**How it's updated**: After each successful query, the `topic` from the QueryPlan is incremented:

```typescript
// In Chat.tsx after receiving QueryPlan
await incrementTopicWeight(plan.topic)
```

**How it's used**: The top 3 topics are included in the Planner prompt to help prioritize relevant SNPs and context:

```typescript
const topicWeights = await getTopThreeTopics()
// Added to planner prompt: "User interests: inflammation (5), metabolism (3), neurodiversity (2)"
```

### Knowledge Graph

Records entities mentioned in interpreter responses with occurrence counts.

```typescript
{
  "IL6": 4,
  "rs1800795": 3,
  "CRP": 2,
  "FTO": 1
}
```

**How it's updated**: After each interpreter response, mentioned genes and SNPs are extracted and incremented:

```typescript
// In Chat.tsx after receiving InterpreterResponse
await updateKnowledgeGraph(plan, response)
```

**How it's used**: Provides context about what genetic topics the user has explored, helping to build continuity across sessions.

### Conversation Summaries

Stores high-level summaries of past conversations for future context.

```typescript
{
  id: "conv_123",
  timestamp: "2024-12-22T10:30:00.000Z",
  topic: "inflammation",
  summary: "User explored IL6 and CRP variants related to inflammatory response",
  keyEntities: ["IL6", "CRP", "rs1800795"]
}
```

**How it's used**: Summaries can be referenced in future conversations to maintain context continuity.

## Viewing and Editing Memory

The **Memory Overview** page (accessible from Settings) displays all memory data:

### Topic Weights View

- Bar chart visualization of topic interests
- Edit individual weights
- Delete topics

### Knowledge Graph View

- Bar chart of entity mentions
- Edit occurrence counts
- Delete entities

### Conversation Summaries View

- List of past conversation summaries
- View full summary details
- Delete individual summaries

## Influence on LLM Prompts

Memory data is incorporated into LLM prompts to personalize responses:

### Planner Prompt

```
System: You are a genetics query planner...

User:
Question: What does my DNA say about metabolism?
Preferences: explanation=normal, tone=calm, showUncertainty=true
Context: User interests: inflammation (5), metabolism (3), neurodiversity (2)
```

### Interpreter Prompt

```
System: You are a genetics educator...

User:
Question: What does my DNA say about metabolism?
Preferences: explanation=normal, tone=calm
Context: inflammation (5), metabolism (3)
Genetic data: [QueryPlan + MatchResult]
```

## Data Control

### Reset Memory

Clear all memory data except preferences (optional):

```typescript
import { resetMemory } from './storage'

// Reset everything except preferences
await resetMemory(false)

// Reset everything including preferences
await resetMemory(true)
```

Access via: **Settings → Preferences → Reset Memory**

### Export Memory

Download all memory data as a JSON file:

```typescript
import { exportMemory } from './storage'

await exportMemory()
// Downloads: dna-chat-memory-2024-12-22.json
```

The export includes:

- Preferences
- Topic weights
- Knowledge graph
- Conversation summaries

Access via: **Settings → Preferences → Export Memory**

### Import Memory

Restore memory from a previously exported JSON file:

```typescript
import { importMemory } from './storage'

await importMemory(file)
// Validates and restores all memory data
```

The import:

1. Validates the JSON structure
2. Clears existing memory
3. Restores all data from the file
4. Reloads the page to sync state

Access via: **Settings → Preferences → Import Memory**

## Privacy Considerations

- All memory data is stored locally in the browser's IndexedDB
- No memory data is sent to any server
- Users have full control to view, edit, export, and delete their data
- Memory can be completely reset at any time
