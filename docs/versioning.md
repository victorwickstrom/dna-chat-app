# IndexedDB Versioning and Migrations

## Database Version

The IndexedDB database version is specified in the `openDB` call in `src/storage/index.ts`:

```typescript
const db = await openDB('dna-chat-db', 1, {
  upgrade(db, oldVersion, newVersion) {
    // Migration logic here
  },
})
```

## Current Schema (Version 1)

| Store                   | Key Path | Description                      |
| ----------------------- | -------- | -------------------------------- |
| `snpIndex`              | `rsid`   | SNP genotype data                |
| `metadata`              | `id`     | File metadata (single record)    |
| `preferences`           | `id`     | User preferences (single record) |
| `topicWeights`          | `topic`  | Topic interest counts            |
| `knowledgeGraph`        | `key`    | Entity mention counts            |
| `conversationSummaries` | `id`     | Conversation summaries           |

## Version History

### Version 1 (Initial)

- Created all base stores
- Initial schema for DNA storage and preferences

## Migration Guide

### When to Bump Version

Increment the database version when:

- Adding a new store
- Removing a store
- Changing a store's key path
- Adding or removing indexes

### How to Write Migrations

```typescript
const db = await openDB('dna-chat-db', 2, {
  upgrade(db, oldVersion, newVersion, transaction) {
    // Migrate from version 1 to 2
    if (oldVersion < 2) {
      // Add new store
      db.createObjectStore('newStore', { keyPath: 'id' })

      // Or modify existing data
      const store = transaction.objectStore('preferences')
      // ... perform data migration
    }

    // Migrate from version 2 to 3
    if (oldVersion < 3) {
      // Next migration
    }
  },
})
```

### Example: Adding a New Store

```typescript
// Version 2: Add 'sessions' store
const db = await openDB('dna-chat-db', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 2) {
      db.createObjectStore('sessions', {
        keyPath: 'id',
        autoIncrement: true,
      })
    }
  },
})
```

### Example: Adding an Index

```typescript
// Version 3: Add index to topicWeights
const db = await openDB('dna-chat-db', 3, {
  upgrade(db, oldVersion, newVersion, transaction) {
    if (oldVersion < 3) {
      const store = transaction.objectStore('topicWeights')
      store.createIndex('byWeight', 'weight')
    }
  },
})
```

### Example: Data Migration

```typescript
// Version 4: Rename preference field
const db = await openDB('dna-chat-db', 4, {
  upgrade(db, oldVersion, newVersion, transaction) {
    if (oldVersion < 4) {
      const store = transaction.objectStore('preferences')
      store.openCursor().then(function migrate(cursor) {
        if (!cursor) return
        const data = cursor.value
        // Transform data
        data.newField = data.oldField
        delete data.oldField
        cursor.update(data)
        return cursor.continue().then(migrate)
      })
    }
  },
})
```

## Best Practices

1. **Always increment version** - Never modify an existing migration
2. **Test migrations** - Test upgrade path from each previous version
3. **Handle missing stores** - Check if store exists before accessing
4. **Document changes** - Update this file with each schema change
5. **Backup data** - Encourage users to export before major updates

## Troubleshooting

### "VersionError" on Open

The database version cannot be downgraded. If you see this error:

- Clear browser data for the site
- Or export user data, clear storage, and re-import

### Store Not Found

If accessing a store that doesn't exist:

```typescript
if (db.objectStoreNames.contains('storeName')) {
  // Safe to access
}
```

### Migration Failed

If a migration fails partway:

- The transaction is rolled back
- Database stays at previous version
- User may need to clear data and start fresh
