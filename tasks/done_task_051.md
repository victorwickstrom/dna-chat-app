### Task 51: Create a user preferences UI.

1. Create `src/components/Preferences.tsx` that reads and updates user preferences from context.
2. Include form elements:
   - A dropdown (`<select>`) for `explanationLevel` with options "Layman", "Normal", and "Technical".
   - A dropdown for `tone` with options "Calm" and "Formal".
   - A checkbox for `showUncertainty` labeled "Show uncertainty in responses".
   - A dropdown for `language` with options "Swedish" (`sv`) and "English" (`en`).
   - A checkbox for `autoSendGenotypes` labeled "Send genotypes automatically without confirmation".
3. Bind each input to the corresponding state and update preferences in context using `setPreferences` when changed.
4. Provide a Save or Apply button to persist preferences to IndexedDB via `savePreferences`.
5. Style the form using Tailwind classes for clarity and user-friendliness.
