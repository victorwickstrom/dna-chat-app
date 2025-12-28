### Task 58: Add multi-language support using i18next.

1. Install `i18next`, `react-i18next`, and `i18next-browser-languagedetector` if not already installed.
2. Create a `locales` folder with subfolders `en` and `sv`. Inside each, define a `translation.json` file that maps string keys to translations.
3. Initialize i18next in a new file `src/i18n.ts`:

   ```ts
   import i18n from 'i18next'
   import { initReactI18next } from 'react-i18next'
   import enTranslation from './locales/en/translation.json'
   import svTranslation from './locales/sv/translation.json'

   i18n.use(initReactI18next).init({
     resources: {
       en: { translation: enTranslation },
       sv: { translation: svTranslation },
     },
     lng: 'sv',
     fallbackLng: 'en',
     interpolation: { escapeValue: false },
   })
   export default i18n
   ```

4. Wrap your application with `<I18nextProvider i18n={i18n}>` (e.g., in `main.tsx`).
5. Use the `useTranslation` hook from `react-i18next` in components to access translation strings: `const { t } = useTranslation()` and then `t('key')`.
6. Populate translation files with keys for UI text (e.g., "DNA Chat Assistant", "Send", "Preferences").
7. Ensure your components refer to translation keys instead of hard-coded strings.
