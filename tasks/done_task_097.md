### Task 97: Document versioning and migrations for IndexedDB.

1. In `docs/versioning.md`, explain how the database version number in the `openDB` call corresponds to schema versions. Document what changes were made in each version (store additions, removals, property changes).
2. Describe how to handle migrations when updating the data schema. For example, if version 2 adds a new store, provide an upgrade function that creates the new store.
3. Encourage developers to bump the version number when changing the schema and to write appropriate `upgrade` logic in the `openDB` call.
