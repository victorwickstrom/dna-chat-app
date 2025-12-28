### Task 78: Write tests for preferences storage and retrieval.

1. Create `src/tests/preferences.test.ts`.
2. Import `savePreferences`, `loadPreferences` and define a sample preferences object.
3. Save the preferences using `savePreferences` and then load them back using `loadPreferences`. Assert that the loaded object matches the saved one.
4. Test that loading preferences when none exist returns the default preferences defined in context.
