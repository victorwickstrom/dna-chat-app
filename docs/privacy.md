# Privacy Policy / Integritetspolicy

_Last updated / Senast uppdaterad: December 2024_

---

## English

### Overview

DNA Chat Assistant is designed with privacy as a core principle. Your genetic data never leaves your device, and we collect no personal information.

### Data Collection

**What we process:**

- Your DNA file (locally in your browser only)
- Minimal genotype summaries (specific rsIDs and their values) sent to AI for interpretation
- Your preferences and settings

**What we do NOT collect:**

- Your name, email, or any identifying information
- Your complete DNA file or raw genetic data
- Your conversation history on any server

### Data Storage

All data is stored locally in your browser using IndexedDB:

| Data Type              | Storage Location    | Purpose                  |
| ---------------------- | ------------------- | ------------------------ |
| DNA Index              | Browser (IndexedDB) | SNP lookup for questions |
| Preferences            | Browser (IndexedDB) | Personalization settings |
| Topic Weights          | Browser (IndexedDB) | Interest tracking        |
| Knowledge Graph        | Browser (IndexedDB) | Entity mention history   |
| Conversation Summaries | Browser (IndexedDB) | Context continuity       |

**Important:** No raw DNA data or personal information is ever uploaded to any server.

### Data Sharing

When you ask a question:

1. The Planner AI receives only your question and preferences
2. The Interpreter AI receives:
   - Your question
   - A small list of specific SNP IDs (e.g., rs1800795)
   - The genotype values for those SNPs (e.g., "GC")
   - Your display preferences

**No complete genetic profile is ever transmitted.**

### User Control

You have full control over your data:

- **View** - See all stored data in Settings → Memory
- **Edit** - Modify topic weights and knowledge graph entries
- **Export** - Download all your data as a JSON file
- **Import** - Restore data from a previous export
- **Delete** - Reset all memory data at any time
- **Clear DNA** - Remove stored DNA index completely

### Disclaimer

**This service is for educational purposes only.**

- We do not provide medical diagnoses
- We do not recommend treatments or medications
- Genetic information is interpreted in general terms only
- Always consult a qualified healthcare professional for medical advice

---

## Svenska

### Översikt

DNA Chat Assistant är utformat med integritet som kärnprincip. Dina genetiska data lämnar aldrig din enhet, och vi samlar inte in någon personlig information.

### Datainsamling

**Vad vi behandlar:**

- Din DNA-fil (endast lokalt i din webbläsare)
- Minimala genotypsammanfattningar (specifika rsID:n och deras värden) som skickas till AI för tolkning
- Dina preferenser och inställningar

**Vad vi INTE samlar in:**

- Ditt namn, e-post eller annan identifierande information
- Din kompletta DNA-fil eller råa genetiska data
- Din konversationshistorik på någon server

### Datalagring

All data lagras lokalt i din webbläsare med IndexedDB:

| Datatyp                       | Lagringsplats          | Syfte                         |
| ----------------------------- | ---------------------- | ----------------------------- |
| DNA-index                     | Webbläsare (IndexedDB) | SNP-sökning för frågor        |
| Preferenser                   | Webbläsare (IndexedDB) | Personaliseringsinställningar |
| Ämnesvikter                   | Webbläsare (IndexedDB) | Intressespårning              |
| Kunskapsgraf                  | Webbläsare (IndexedDB) | Entitetshistorik              |
| Konversationssammanfattningar | Webbläsare (IndexedDB) | Kontextkontinuitet            |

**Viktigt:** Ingen rå DNA-data eller personlig information laddas någonsin upp till någon server.

### Datadelning

När du ställer en fråga:

1. Planner-AI:n får endast din fråga och preferenser
2. Interpreter-AI:n får:
   - Din fråga
   - En liten lista med specifika SNP-ID:n (t.ex. rs1800795)
   - Genotypvärdena för dessa SNP:er (t.ex. "GC")
   - Dina visningspreferenser

**Ingen komplett genetisk profil överförs någonsin.**

### Användarkontroll

Du har full kontroll över din data:

- **Visa** - Se all lagrad data i Inställningar → Minne
- **Redigera** - Ändra ämnesvikter och kunskapsgrafposter
- **Exportera** - Ladda ner all din data som en JSON-fil
- **Importera** - Återställ data från en tidigare export
- **Radera** - Återställ all minnesdata när som helst
- **Rensa DNA** - Ta bort lagrad DNA-index helt

### Ansvarsfriskrivning

**Denna tjänst är endast för utbildningsändamål.**

- Vi ger inga medicinska diagnoser
- Vi rekommenderar inte behandlingar eller mediciner
- Genetisk information tolkas endast i allmänna termer
- Kontakta alltid kvalificerad sjukvårdspersonal för medicinsk rådgivning

---

## Contact / Kontakt

For questions about this privacy policy, please contact the project maintainers.

För frågor om denna integritetspolicy, vänligen kontakta projektansvariga.
