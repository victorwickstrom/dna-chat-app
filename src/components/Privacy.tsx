import { useTranslation } from 'react-i18next'

const Privacy = () => {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'sv'

  const content =
    lang === 'en' ? (
      <>
        <p className="mb-4 text-sm text-slate-500">Last updated: December 2024</p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">Your Data Stays Local</h3>
        <p className="mb-4 text-sm text-slate-600">
          Your raw DNA file is processed entirely in your browser. The genetic data is stored
          locally using IndexedDB and is <strong>never uploaded</strong> to any server.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">What Gets Sent to the AI</h3>
        <p className="mb-4 text-sm text-slate-600">
          When you ask a question, only minimal genotype summaries (specific SNP IDs and their
          values) relevant to your question are sent to the language model for interpretation. Your
          complete DNA profile is never transmitted.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">Local Storage</h3>
        <p className="mb-2 text-sm text-slate-600">The following data is stored in your browser:</p>
        <ul className="mb-4 list-inside list-disc text-sm text-slate-600">
          <li>Your DNA index (SNP data)</li>
          <li>Your preferences (language, display settings)</li>
          <li>Topic weights and knowledge graph (personalization data)</li>
          <li>Conversation summaries</li>
        </ul>
        <p className="mb-4 text-sm text-slate-600">
          You can export, import, or delete this data at any time from the Settings page.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">Not Medical Advice</h3>
        <p className="mb-4 text-sm text-slate-600">
          This service provides educational information about genetics only. It does{' '}
          <strong>not</strong> provide medical diagnoses, treatment recommendations, or health
          advice. Always consult a qualified healthcare professional for medical questions.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">Deleting Your Data</h3>
        <p className="text-sm text-slate-600">
          To remove all stored data, use the "Reset Memory" button in Settings, or clear your
          browser's local storage for this site. You can also export your data before deletion.
        </p>
      </>
    ) : (
      <>
        <p className="mb-4 text-sm text-slate-500">Senast uppdaterad: December 2024</p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">Din data stannar lokalt</h3>
        <p className="mb-4 text-sm text-slate-600">
          Din råa DNA-fil bearbetas helt i din webbläsare. Genetiska data lagras lokalt med
          IndexedDB och <strong>laddas aldrig upp</strong> till någon server.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">Vad som skickas till AI:n</h3>
        <p className="mb-4 text-sm text-slate-600">
          När du ställer en fråga skickas endast minimala genotypsammanfattningar (specifika
          SNP-ID:n och deras värden) som är relevanta för din fråga till språkmodellen för tolkning.
          Din kompletta DNA-profil överförs aldrig.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">Lokal lagring</h3>
        <p className="mb-2 text-sm text-slate-600">Följande data lagras i din webbläsare:</p>
        <ul className="mb-4 list-inside list-disc text-sm text-slate-600">
          <li>Ditt DNA-index (SNP-data)</li>
          <li>Dina inställningar (språk, visningsinställningar)</li>
          <li>Ämnesvikter och kunskapsgraf (personaliseringsdata)</li>
          <li>Konversationssammanfattningar</li>
        </ul>
        <p className="mb-4 text-sm text-slate-600">
          Du kan exportera, importera eller radera denna data när som helst från Inställningar.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">Inte medicinsk rådgivning</h3>
        <p className="mb-4 text-sm text-slate-600">
          Denna tjänst ger endast utbildningsinformation om genetik. Den ger <strong>inte</strong>{' '}
          medicinska diagnoser, behandlingsrekommendationer eller hälsoråd. Kontakta alltid
          kvalificerad sjukvårdspersonal för medicinska frågor.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">Radera din data</h3>
        <p className="text-sm text-slate-600">
          För att ta bort all lagrad data, använd knappen "Återställ minne" i Inställningar, eller
          rensa webbläsarens lokala lagring för denna webbplats. Du kan också exportera din data
          innan du raderar.
        </p>
      </>
    )

  return (
    <div className="w-full max-w-2xl rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">
        {lang === 'en' ? 'Privacy & Data Policy' : 'Integritet & Datapolicy'}
      </h2>
      {content}
    </div>
  )
}

export default Privacy
