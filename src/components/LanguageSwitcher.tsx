import { useTranslation } from 'react-i18next'
import { useGlobalContext } from '../context/AppContext'
import { savePreferences } from '../storage'

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  const { preferences, setPreferences } = useGlobalContext()

  const handleChange = async (lang: 'sv' | 'en') => {
    await i18n.changeLanguage(lang)
    const updatedPrefs = { ...preferences, language: lang }
    setPreferences(updatedPrefs)
    await savePreferences(updatedPrefs)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleChange('sv')}
        className={`rounded px-2 py-1 text-sm font-medium transition ${
          i18n.language === 'sv'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        SV
      </button>
      <button
        onClick={() => handleChange('en')}
        className={`rounded px-2 py-1 text-sm font-medium transition ${
          i18n.language === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        EN
      </button>
    </div>
  )
}

export default LanguageSwitcher
