### Task 59: Implement language switcher.

1. Create `src/components/LanguageSwitcher.tsx`. Use the `useTranslation` hook to get the current language (`i18n.language`) and a function to change it (`i18n.changeLanguage`).
2. Render a dropdown or toggle with available languages ("sv" and "en"). When the user selects a new language, call `changeLanguage(newLang)` and update the `language` preference in context.
3. Save the selected language to IndexedDB via `savePreferences`. This ensures the language persists across sessions.
4. Use this component in your settings page or header so the user can switch languages at any time.
