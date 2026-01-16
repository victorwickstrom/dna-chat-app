import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// =============================================================================
// AI Response Cache - Stores rsid+gene explanations to reduce API calls
// =============================================================================
const CACHE_FILE = path.join(__dirname, 'ai_cache.json')

// In-memory cache (loaded from file on startup)
let aiCache = new Map()

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
      aiCache = new Map(Object.entries(data))
      console.log(`[Cache] Loaded ${aiCache.size} cached AI responses`)
    }
  } catch (err) {
    console.error('[Cache] Failed to load cache:', err.message)
    aiCache = new Map()
  }
}

function saveCache() {
  try {
    const data = Object.fromEntries(aiCache)
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('[Cache] Failed to save cache:', err.message)
  }
}

function getCacheKey(rsid, gene, genotype) {
  return `${rsid}:${gene || 'unknown'}:${genotype}`.toLowerCase()
}

// Load cache on startup
loadCache()

// Azure OpenAI configuration (invoicemate-sweden in swedencentral)
const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT || 'https://swedencentral.api.cognitive.microsoft.com'
const AZURE_API_KEY = process.env.AZURE_API_KEY || ''
const AZURE_DEPLOYMENT = process.env.AZURE_DEPLOYMENT || 'gpt-4o'
const AZURE_API_VERSION = '2024-02-15-preview'

const buildAzureUrl = () =>
  `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing messages array' })
    }

    console.log('Calling Azure OpenAI with deployment:', AZURE_DEPLOYMENT)
    
    const url = buildAzureUrl()
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_API_KEY,
      },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Azure OpenAI error:', response.status, errorText)
      return res.status(response.status).json({ error: errorText })
    }

    const data = await response.json()
    console.log('Azure OpenAI response received')
    res.json(data)
  } catch (error) {
    console.error('Server error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', deployment: AZURE_DEPLOYMENT, cacheSize: aiCache.size })
})

// =============================================================================
// SNP AI Enrichment Endpoint
// Takes matched SNPs and returns AI explanations (cached when possible)
// =============================================================================
app.post('/api/snp/enrich', async (req, res) => {
  try {
    const { snps } = req.body
    
    if (!snps || !Array.isArray(snps)) {
      return res.status(400).json({ error: 'Missing snps array' })
    }
    
    const results = []
    const uncachedSnps = []
    
    // Check cache for each SNP
    for (const snp of snps) {
      const cacheKey = getCacheKey(snp.rsid, snp.gene, snp.genotype)
      const cached = aiCache.get(cacheKey)
      
      if (cached) {
        results.push({ ...snp, ...cached, fromCache: true })
      } else {
        uncachedSnps.push(snp)
      }
    }
    
    console.log(`[SNP Enrich] ${results.length} from cache, ${uncachedSnps.length} need AI`)
    
    // Process uncached SNPs in batches (max 10 at a time to avoid token limits)
    const BATCH_SIZE = 10
    for (let i = 0; i < uncachedSnps.length; i += BATCH_SIZE) {
      const batch = uncachedSnps.slice(i, i + BATCH_SIZE)
      
      const prompt = buildSnpPrompt(batch)
      
      try {
        const url = buildAzureUrl()
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': AZURE_API_KEY,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: `Du är en genetisk rådgivare som förklarar SNP-varianter på ett lättförståeligt sätt på svenska. 
Var faktabaserad men undvik att skapa oro. Förklara vad varje genetisk variant betyder för hälsan.
Svara ALLTID i JSON-format som en array med objekt.`
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 4000,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          const content = data.choices?.[0]?.message?.content || ''
          
          // Parse AI response
          const aiResults = parseAiResponse(content, batch)
          
          // Cache and add to results
          for (const result of aiResults) {
            const cacheKey = getCacheKey(result.rsid, result.gene, result.genotype)
            const enrichment = {
              aiExplanation: result.aiExplanation,
              aiRiskLevel: result.aiRiskLevel,
              aiHealthImplications: result.aiHealthImplications,
              aiRecommendations: result.aiRecommendations,
            }
            aiCache.set(cacheKey, enrichment)
            results.push({ ...result, ...enrichment, fromCache: false })
          }
          
          // Save cache after each batch
          saveCache()
        } else {
          console.error('[SNP Enrich] AI call failed:', response.status)
          // Add without AI enrichment
          for (const snp of batch) {
            results.push({ ...snp, aiError: true })
          }
        }
      } catch (err) {
        console.error('[SNP Enrich] Batch error:', err.message)
        for (const snp of batch) {
          results.push({ ...snp, aiError: true })
        }
      }
    }
    
    res.json({ 
      enrichedSnps: results,
      stats: {
        total: snps.length,
        fromCache: results.filter(r => r.fromCache).length,
        newlyEnriched: results.filter(r => r.fromCache === false).length,
        errors: results.filter(r => r.aiError).length,
      }
    })
  } catch (error) {
    console.error('[SNP Enrich] Error:', error)
    res.status(500).json({ error: error.message })
  }
})

function buildSnpPrompt(snps) {
  const snpList = snps.map(s => 
    `- ${s.rsid} (${s.genotype}): Gen: ${s.gene || 'okänd'}, Kategori: ${s.category || 'neutral'}, Vikt: ${s.weight}, Beskrivning: ${s.description || 'ingen'}`
  ).join('\n')
  
  return `Analysera följande genetiska varianter och förklara deras betydelse för hälsan.

${snpList}

Svara i JSON-format som en array. För varje variant, inkludera:
{
  "rsid": "rsXXXXXX",
  "aiExplanation": "Kort förklaring på svenska om vad denna variant betyder",
  "aiRiskLevel": "low|moderate|elevated|high",
  "aiHealthImplications": ["implikation 1", "implikation 2"],
  "aiRecommendations": ["rekommendation 1"]
}

Svara ENDAST med JSON-arrayen, inget annat.`
}

function parseAiResponse(content, originalSnps) {
  try {
    // Try to extract JSON from the response
    let jsonStr = content.trim()
    
    // Handle markdown code blocks
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    }
    
    const parsed = JSON.parse(jsonStr)
    
    if (Array.isArray(parsed)) {
      // Match back to original SNPs
      return originalSnps.map(snp => {
        const aiResult = parsed.find(p => p.rsid === snp.rsid) || {}
        return { ...snp, ...aiResult }
      })
    }
  } catch (err) {
    console.error('[SNP Enrich] Failed to parse AI response:', err.message)
  }
  
  // Fallback: return originals with generic message
  return originalSnps.map(snp => ({
    ...snp,
    aiExplanation: 'Kunde inte generera AI-förklaring för denna variant.',
    aiRiskLevel: snp.category === 'Bad' ? 'elevated' : 'low',
    aiHealthImplications: [],
    aiRecommendations: [],
  }))
}

// Get cache stats
app.get('/api/snp/cache-stats', (req, res) => {
  res.json({
    size: aiCache.size,
    keys: Array.from(aiCache.keys()).slice(0, 100), // First 100 keys
  })
})

// Clear cache (admin endpoint)
app.delete('/api/snp/cache', (req, res) => {
  aiCache.clear()
  saveCache()
  res.json({ message: 'Cache cleared' })
})

// =============================================================================
// SNP Chat Explanation Cache - Stores per-SNP chat texts
// =============================================================================
const CHAT_CACHE_DIR = path.join(__dirname, 'snp_chat_cache')

// Ensure cache directory exists
if (!fs.existsSync(CHAT_CACHE_DIR)) {
  fs.mkdirSync(CHAT_CACHE_DIR, { recursive: true })
  console.log('[ChatCache] Created cache directory:', CHAT_CACHE_DIR)
}

function getSnpChatCacheFile(rsid, genotype) {
  const safeKey = `${rsid}_${genotype.replace(/[;\/]/g, '-')}`.toLowerCase()
  return path.join(CHAT_CACHE_DIR, `${safeKey}.json`)
}

function loadSnpChatCache(rsid, genotype) {
  const file = getSnpChatCacheFile(rsid, genotype)
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'))
    }
  } catch (err) {
    console.error(`[ChatCache] Failed to load ${file}:`, err.message)
  }
  return null
}

function saveSnpChatCache(rsid, genotype, data) {
  const file = getSnpChatCacheFile(rsid, genotype)
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
  } catch (err) {
    console.error(`[ChatCache] Failed to save ${file}:`, err.message)
  }
}

// =============================================================================
// Generate Chat Explanation for Risk SNPs
// Returns a comprehensive chat message explaining the user's genetic risks
// =============================================================================
app.post('/api/snp/generate-chat', async (req, res) => {
  try {
    const { riskSnps } = req.body
    
    if (!riskSnps || !Array.isArray(riskSnps) || riskSnps.length === 0) {
      return res.status(400).json({ error: 'Missing or empty riskSnps array' })
    }
    
    console.log(`[GenerateChat] Processing ${riskSnps.length} risk SNPs`)
    
    // Step 1: Get cached or generate explanations for each SNP
    const snpExplanations = []
    const uncachedSnps = []
    
    for (const snp of riskSnps) {
      const cached = loadSnpChatCache(snp.rsid, snp.genotype)
      if (cached) {
        snpExplanations.push({ ...snp, ...cached, fromCache: true })
      } else {
        uncachedSnps.push(snp)
      }
    }
    
    console.log(`[GenerateChat] ${snpExplanations.length} from cache, ${uncachedSnps.length} need AI`)
    
    // Step 2: Generate explanations for uncached SNPs (in batches)
    const BATCH_SIZE = 5
    for (let i = 0; i < uncachedSnps.length; i += BATCH_SIZE) {
      const batch = uncachedSnps.slice(i, i + BATCH_SIZE)
      
      try {
        const url = buildAzureUrl()
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': AZURE_API_KEY,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: `Du är en genetisk rådgivare som skriver korta, lättlästa förklaringar på svenska.
För varje SNP, skriv:
1. En kort titel (gennamn om känt)
2. En förklaring på 2-3 meningar om vad varianten betyder
3. En risknivå: låg, måttlig, förhöjd, eller hög
4. En kort rekommendation

Var informativ men lugn. Undvik att skapa onödig oro.
Svara i JSON-array format.`
              },
              { 
                role: 'user', 
                content: buildChatPrompt(batch)
              }
            ],
            temperature: 0.4,
            max_tokens: 2000,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          const content = data.choices?.[0]?.message?.content || ''
          const parsed = parseChatAiResponse(content, batch)
          
          // Cache each SNP explanation individually
          for (const item of parsed) {
            saveSnpChatCache(item.rsid, item.genotype, {
              title: item.title,
              explanation: item.explanation,
              riskLevel: item.riskLevel,
              recommendation: item.recommendation,
            })
            snpExplanations.push({ ...item, fromCache: false })
          }
        } else {
          console.error('[GenerateChat] AI call failed:', response.status)
          for (const snp of batch) {
            snpExplanations.push({
              ...snp,
              title: snp.gene || snp.rsid,
              explanation: snp.description || 'Ingen detaljerad information tillgänglig.',
              riskLevel: 'måttlig',
              recommendation: 'Konsultera en läkare för mer information.',
              fromCache: false,
              aiError: true,
            })
          }
        }
      } catch (err) {
        console.error('[GenerateChat] Batch error:', err.message)
      }
    }
    
    // Step 3: Sort by risk level (highest first)
    const riskOrder = { 'hög': 0, 'förhöjd': 1, 'måttlig': 2, 'låg': 3 }
    snpExplanations.sort((a, b) => {
      const aOrder = riskOrder[a.riskLevel?.toLowerCase()] ?? 2
      const bOrder = riskOrder[b.riskLevel?.toLowerCase()] ?? 2
      return aOrder - bOrder
    })
    
    // Step 4: Compile the chat message
    const chatMessage = compileChatMessage(snpExplanations)
    
    res.json({
      chatMessage,
      snpDetails: snpExplanations,
      stats: {
        total: riskSnps.length,
        fromCache: snpExplanations.filter(s => s.fromCache).length,
        generated: snpExplanations.filter(s => !s.fromCache).length,
      }
    })
    
  } catch (error) {
    console.error('[GenerateChat] Error:', error)
    res.status(500).json({ error: error.message })
  }
})

function buildChatPrompt(snps) {
  const list = snps.map(s => 
    `- ${s.rsid} (genotyp: ${s.genotype}), gen: ${s.gene || 'okänd'}, vikt: ${s.weight}, beskrivning: "${s.description || 'ingen'}"`
  ).join('\n')
  
  return `Förklara följande genetiska riskvarianter för en användare:

${list}

Svara som en JSON-array med objekt:
[
  {
    "rsid": "rsXXXXXX",
    "title": "Kort titel (t.ex. gennamn)",
    "explanation": "2-3 meningar som förklarar vad denna variant betyder för hälsan",
    "riskLevel": "låg|måttlig|förhöjd|hög",
    "recommendation": "En kort rekommendation"
  }
]

Endast JSON, inget annat.`
}

function parseChatAiResponse(content, originalSnps) {
  try {
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    }
    
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) {
      return originalSnps.map(snp => {
        const match = parsed.find(p => p.rsid === snp.rsid) || {}
        return {
          ...snp,
          title: match.title || snp.gene || snp.rsid,
          explanation: match.explanation || snp.description || 'Ingen information.',
          riskLevel: match.riskLevel || 'måttlig',
          recommendation: match.recommendation || 'Konsultera en läkare.',
        }
      })
    }
  } catch (err) {
    console.error('[GenerateChat] Parse error:', err.message)
  }
  
  return originalSnps.map(snp => ({
    ...snp,
    title: snp.gene || snp.rsid,
    explanation: snp.description || 'Ingen information tillgänglig.',
    riskLevel: 'måttlig',
    recommendation: 'Konsultera en läkare för mer information.',
  }))
}

function compileChatMessage(snpExplanations) {
  if (snpExplanations.length === 0) {
    return 'Vi hittade inga genetiska riskvarianter i din DNA-data. Det är goda nyheter!'
  }
  
  // Group by risk level
  const highRisk = snpExplanations.filter(s => s.riskLevel?.toLowerCase() === 'hög')
  const elevatedRisk = snpExplanations.filter(s => s.riskLevel?.toLowerCase() === 'förhöjd')
  const moderateRisk = snpExplanations.filter(s => s.riskLevel?.toLowerCase() === 'måttlig')
  
  let message = `## 🧬 Din genetiska riskanalys\n\n`
  message += `Vi har analyserat din DNA och hittat **${snpExplanations.length} genetiska varianter** som kan vara relevanta för din hälsa.\n\n`
  
  // High risk section
  if (highRisk.length > 0) {
    message += `### ⚠️ Hög uppmärksamhet (${highRisk.length})\n\n`
    for (const snp of highRisk) {
      message += `**${snp.title}** (${snp.rsid})\n`
      message += `${snp.explanation}\n`
      message += `💡 *${snp.recommendation}*\n\n`
    }
  }
  
  // Elevated risk section
  if (elevatedRisk.length > 0) {
    message += `### 🔶 Förhöjd risk (${elevatedRisk.length})\n\n`
    for (const snp of elevatedRisk.slice(0, 5)) { // Limit to 5
      message += `**${snp.title}** (${snp.rsid})\n`
      message += `${snp.explanation}\n\n`
    }
    if (elevatedRisk.length > 5) {
      message += `*...och ${elevatedRisk.length - 5} fler varianter med förhöjd risk.*\n\n`
    }
  }
  
  // Moderate risk summary
  if (moderateRisk.length > 0) {
    message += `### ℹ️ Måttlig relevans (${moderateRisk.length})\n\n`
    message += `Du har även ${moderateRisk.length} varianter med måttlig relevans. Dessa är vanliga i befolkningen och innebär oftast ingen ökad risk.\n\n`
  }
  
  // Disclaimer
  message += `---\n\n`
  message += `**⚕️ Viktigt att komma ihåg:**\n\n`
  message += `Genetik är bara *en del* av din hälsobild. Miljö, livsstil, kost och andra faktorer spelar ofta en större roll. `
  message += `Många människor har dessa genetiska varianter utan att någonsin utveckla relaterade tillstånd.\n\n`
  message += `Denna analys är **endast för informationsändamål** och ersätter inte medicinsk rådgivning. `
  message += `Om du har frågor eller oro, prata med din läkare eller en genetisk rådgivare.\n`
  
  return message
}

// =============================================================================
// GLOBAL LEARNING API - Persists learning across all users
// =============================================================================

const LEARNING_FILE = path.join(__dirname, 'global_learning.json')

// Topic → SNP mappings (what SNPs to analyze for each topic)
const TOPIC_SNP_MAPPINGS = {
  eye_color: {
    keywords: ['ögonfärg', 'eye color', 'ögon', 'blå ögon', 'bruna ögon', 'gröna ögon'],
    display_name: 'Eye Color',
    snps: ['rs12913832', 'rs1800407', 'rs12896399'],
    category: 'trait',
  },
  hair_color: {
    keywords: ['hårfärg', 'hair color', 'blont', 'brunt', 'rött hår', 'blonde'],
    display_name: 'Hair Color',
    snps: ['rs12821256', 'rs1805007', 'rs1805008'],
    category: 'trait',
  },
  brca: {
    keywords: ['brca', 'brca1', 'brca2', 'bröstcancer', 'breast cancer', 'ovariecancer'],
    display_name: 'BRCA Cancer Genes',
    snps: ['rs80357906', 'rs80358981', 'rs1799950', 'rs1799966', 'rs16942'],
    category: 'cancer_risk',
  },
  alzheimers: {
    keywords: ['alzheimer', 'demens', 'dementia', 'apoe', 'minne'],
    display_name: 'Alzheimers Risk',
    snps: ['rs429358', 'rs7412'],
    category: 'disease_risk',
  },
  parkinsons: {
    keywords: ['parkinson', 'lrrk2', 'gba', 'tremor'],
    display_name: 'Parkinsons Risk',
    snps: ['rs34637584'],
    category: 'disease_risk',
  },
  celiac: {
    keywords: ['celiaki', 'celiac', 'gluten', 'hla-dq2', 'glutenkänslighet'],
    display_name: 'Celiac Disease',
    snps: ['rs2187668', 'rs7454108'],
    category: 'disease_risk',
  },
  clotting: {
    keywords: ['blodpropp', 'trombos', 'thrombosis', 'factor v', 'leiden'],
    display_name: 'Blood Clot Risk',
    snps: ['rs6025', 'rs1799963'],
    category: 'disease_risk',
  },
  caffeine: {
    keywords: ['koffein', 'caffeine', 'kaffe', 'coffee'],
    display_name: 'Caffeine Metabolism',
    snps: ['rs762551'],
    category: 'metabolism',
  },
  lactose: {
    keywords: ['laktos', 'lactose', 'mjölk', 'dairy'],
    display_name: 'Lactose Tolerance',
    snps: ['rs4988235'],
    category: 'metabolism',
  },
  vitamin_d: {
    keywords: ['vitamin d', 'd-vitamin', 'solljus'],
    display_name: 'Vitamin D Metabolism',
    snps: ['rs2282679', 'rs10741657'],
    category: 'metabolism',
  },
  earwax: {
    keywords: ['öronvax', 'earwax', 'ear wax', 'cerumen', 'vax i öronen'],
    display_name: 'Earwax Type',
    snps: ['rs17822931'],
    category: 'trait',
  },
  muscle: {
    keywords: ['muskel', 'muscle', 'sprinter', 'uthållighet', 'actn3', 'styrka'],
    display_name: 'Muscle Type',
    snps: ['rs1815739'],
    category: 'trait',
  },
  bitter_taste: {
    keywords: ['bitter', 'besk', 'smak', 'taste', 'ptc', 'prop'],
    display_name: 'Bitter Taste Perception',
    snps: ['rs713598', 'rs1726866', 'rs10246939'],
    category: 'trait',
  },
  alcohol: {
    keywords: ['alkohol', 'alcohol', 'sprit', 'vin', 'öl', 'flush'],
    display_name: 'Alcohol Metabolism',
    snps: ['rs671', 'rs1229984'],
    category: 'metabolism',
  },
  sleep: {
    keywords: ['sömn', 'sleep', 'morgon', 'kväll', 'dygnsrytm', 'circadian'],
    display_name: 'Sleep Pattern',
    snps: ['rs57875989', 'rs12927162'],
    category: 'trait',
  },
  glaucoma: {
    keywords: ['glaukom', 'glaucoma', 'ögontryck', 'eye pressure', 'grön starr'],
    display_name: 'Glaucoma Risk',
    snps: ['rs10483727', 'rs4236601', 'rs2165241', 'rs10120688'],
    category: 'disease_risk',
  },
  macular_degeneration: {
    keywords: ['makuladegeneration', 'macular degeneration', 'amd', 'åldersrelaterad makuladegeneration'],
    display_name: 'Macular Degeneration Risk',
    snps: ['rs1061170', 'rs10490924', 'rs2230199'],
    category: 'disease_risk',
  },
  heart_disease: {
    keywords: ['hjärtsjukdom', 'heart disease', 'hjärtinfarkt', 'heart attack', 'kardiovaskulär'],
    display_name: 'Heart Disease Risk',
    snps: ['rs1333049', 'rs10757278', 'rs4977574'],
    category: 'disease_risk',
  },
  diabetes_type2: {
    keywords: ['diabetes', 'typ 2 diabetes', 'type 2 diabetes', 'blodsocker', 'blood sugar'],
    display_name: 'Type 2 Diabetes Risk',
    snps: ['rs7903146', 'rs12255372', 'rs1801282'],
    category: 'disease_risk',
  },
}

// Default auto-analyze topics (always included)
const DEFAULT_AUTO_ANALYZE = [
  'eye_color',
  'hair_color', 
  'caffeine',
  'lactose',
  'vitamin_d',
]

// Load learning state from file
let globalLearningState = {
  learned_topics: {},
  total_requests: 0,
  auto_analyze: [...DEFAULT_AUTO_ANALYZE], // Topics to auto-analyze for all users
}

function loadLearningState() {
  try {
    if (fs.existsSync(LEARNING_FILE)) {
      const loaded = JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf-8'))
      globalLearningState = loaded
      
      // Ensure default topics are always included
      for (const topic of DEFAULT_AUTO_ANALYZE) {
        if (!globalLearningState.auto_analyze.includes(topic)) {
          globalLearningState.auto_analyze.push(topic)
        }
      }
      
      console.log(`[Learning] Loaded state: ${Object.keys(globalLearningState.learned_topics).length} topics, ${globalLearningState.auto_analyze.length} auto-analyze`)
    } else {
      // First run - save default state
      saveLearningState()
      console.log(`[Learning] Created default state with ${DEFAULT_AUTO_ANALYZE.length} auto-analyze topics`)
    }
  } catch (err) {
    console.error('[Learning] Failed to load state:', err.message)
  }
}

function saveLearningState() {
  try {
    fs.writeFileSync(LEARNING_FILE, JSON.stringify(globalLearningState, null, 2))
  } catch (err) {
    console.error('[Learning] Failed to save state:', err.message)
  }
}

// Detect topics from question
function detectTopics(question) {
  const lower = question.toLowerCase()
  const detected = []
  
  for (const [topic, config] of Object.entries(TOPIC_SNP_MAPPINGS)) {
    for (const keyword of config.keywords) {
      if (lower.includes(keyword)) {
        detected.push(topic)
        break
      }
    }
  }
  
  return detected
}

// Load on startup
loadLearningState()

// GET /api/learning - Get current learning state
app.get('/api/learning', (req, res) => {
  res.json({
    learned_topics: globalLearningState.learned_topics,
    auto_analyze: globalLearningState.auto_analyze,
    total_requests: globalLearningState.total_requests,
    available_topics: Object.keys(TOPIC_SNP_MAPPINGS),
  })
})

// GET /api/learning/auto-analyze - Get topics to auto-analyze for risk analysis
app.get('/api/learning/auto-analyze', (req, res) => {
  const topics = globalLearningState.auto_analyze.map(topicId => {
    const config = TOPIC_SNP_MAPPINGS[topicId]
    return {
      id: topicId,
      display_name: config?.display_name || topicId,
      snps: config?.snps || [],
      category: config?.category || 'other',
    }
  })
  
  res.json({ topics })
})

// Detect rsids in a question (e.g., rs12913832, rs4680)
function detectRsids(question) {
  const rsidPattern = /rs\d{1,10}/gi
  const matches = question.match(rsidPattern) || []
  return [...new Set(matches.map(r => r.toLowerCase()))]
}

// Fetch and cache SNPedia data for an rsid using MediaWiki API
async function fetchAndCacheSnp(rsid) {
  const cacheFile = path.join(SNPEDIA_CACHE_DIR, `${rsid}.json`)
  
  // Already cached?
  if (fs.existsSync(cacheFile)) {
    return { rsid, cached: true, fetched: false }
  }
  
  try {
    console.log(`[SNPedia] Auto-fetching ${rsid} via API...`)
    // Use MediaWiki API for cleaner data
    const apiUrl = `https://bots.snpedia.com/api.php?action=query&titles=${rsid}&prop=revisions&rvprop=content&format=json`
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'DNAChatApp/1.0 (genetic education tool)',
      },
      timeout: 10000,
    })
    
    if (!response.ok) {
      console.log(`[SNPedia] Failed to fetch ${rsid}: HTTP ${response.status}`)
      return { rsid, cached: false, fetched: false, error: `HTTP ${response.status}` }
    }
    
    const data = await response.json()
    const pages = data.query?.pages || {}
    const pageContent = Object.values(pages)[0]
    
    if (!pageContent || pageContent.missing !== undefined) {
      console.log(`[SNPedia] Page not found for ${rsid}`)
      return { rsid, cached: false, fetched: false, error: 'Page not found' }
    }
    
    const wikitext = pageContent.revisions?.[0]?.['*'] || ''
    const parsed = parseSnpediaWikitext(rsid, wikitext)
    
    fs.writeFileSync(cacheFile, JSON.stringify(parsed, null, 2))
    console.log(`[SNPedia] Cached ${rsid} (gene: ${parsed.gene || 'unknown'})`)
    
    return { rsid, cached: false, fetched: true }
  } catch (err) {
    console.log(`[SNPedia] Error fetching ${rsid}:`, err.message)
    return { rsid, cached: false, fetched: false, error: err.message }
  }
}

// Parse SNPedia wikitext to extract structured data
function parseSnpediaWikitext(rsid, wikitext) {
  const result = {
    rsid,
    fetched_at: new Date().toISOString(),
    source: 'SNPedia',
    gene: null,
    chromosome: null,
    summary: '',
    genotypes: {},
    magnitude: null,
  }
  
  // Extract from {{Rsnum template
  const geneMatch = wikitext.match(/\|Gene=([A-Z0-9]+)/i)
  if (geneMatch) result.gene = geneMatch[1]
  
  const chrMatch = wikitext.match(/\|Chromosome=(\d+|X|Y)/i)
  if (chrMatch) result.chromosome = chrMatch[1]
  
  // Extract genotypes
  const genoMatches = wikitext.match(/\|geno\d+=\(([ACGT]);([ACGT])\)/gi) || []
  for (const g of genoMatches) {
    const m = g.match(/\(([ACGT]);([ACGT])\)/i)
    if (m) {
      result.genotypes[`${m[1]};${m[2]}`] = { description: 'See SNPedia for details' }
    }
  }
  
  // Extract summary - find the main descriptive text
  // Look for text that starts after }} and contains actual description
  const lines = wikitext.split('\n')
  let inTemplate = 0
  let summaryLines = []
  
  for (const line of lines) {
    // Track template depth
    inTemplate += (line.match(/\{\{/g) || []).length
    inTemplate -= (line.match(/\}\}/g) || []).length
    
    // Skip lines inside templates or that are template markers
    if (inTemplate > 0 || line.startsWith('{{') || line.startsWith('|')) continue
    
    // Clean the line
    let cleaned = line
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[link|text]] -> text
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // [[link]] -> link
      .replace(/\{\{[^}]+\}\}/g, '') // Remove inline templates
      .replace(/\[http[^\]]+\s+([^\]]+)\]/g, '$1') // [url text] -> text
      .replace(/\[http[^\]]+\]/g, '') // Remove bare URLs
      .replace(/'''?/g, '') // Remove bold/italic
      .trim()
    
    // Skip empty lines or very short lines
    if (cleaned.length < 10) continue
    
    // Skip lines that are just rsid references
    if (cleaned.toLowerCase().startsWith('rs') && cleaned.length < 20) continue
    
    summaryLines.push(cleaned)
    
    // Stop after getting enough content
    if (summaryLines.join(' ').length > 600) break
  }
  
  if (summaryLines.length > 0) {
    result.summary = summaryLines.join(' ').substring(0, 800)
  }
  
  // Extract magnitude if present
  const magMatch = wikitext.match(/\|[Mm]agnitude=(\d+\.?\d*)/i)
  if (magMatch) result.magnitude = parseFloat(magMatch[1])
  
  return result
}

// POST /api/learning/record - Record a question and learn from it
app.post('/api/learning/record', async (req, res) => {
  const { question } = req.body
  
  if (!question) {
    return res.status(400).json({ error: 'Missing question' })
  }
  
  const detectedTopics = detectTopics(question)
  const detectedRsids = detectRsids(question)
  const newTopics = []
  const snpResults = []
  
  // Fetch any SNPs mentioned that aren't cached (in parallel)
  if (detectedRsids.length > 0) {
    const fetchPromises = detectedRsids.map(rsid => fetchAndCacheSnp(rsid))
    const results = await Promise.all(fetchPromises)
    snpResults.push(...results)
    
    const newlyCached = results.filter(r => r.fetched).length
    if (newlyCached > 0) {
      console.log(`[Learning] Cached ${newlyCached} new SNPs from question`)
    }
  }
  
  for (const topic of detectedTopics) {
    // Record the topic
    if (!globalLearningState.learned_topics[topic]) {
      globalLearningState.learned_topics[topic] = {
        first_requested: Date.now(),
        request_count: 0,
      }
    }
    
    globalLearningState.learned_topics[topic].request_count++
    globalLearningState.learned_topics[topic].last_requested = Date.now()
    
    // Auto-add to analyze list after 1+ requests (immediate learning)
    if (!globalLearningState.auto_analyze.includes(topic)) {
      globalLearningState.auto_analyze.push(topic)
      newTopics.push(topic)
      console.log(`[Learning] New topic added to auto-analyze: ${topic}`)
    }
  }
  
  globalLearningState.total_requests++
  saveLearningState()
  
  res.json({
    detected_topics: detectedTopics,
    detected_rsids: detectedRsids,
    snp_cache_results: snpResults,
    new_topics_added: newTopics,
    auto_analyze_count: globalLearningState.auto_analyze.length,
  })
})

// GET /api/learning/snps-for-topics - Get SNPs to analyze for given topics
app.get('/api/learning/snps-for-topics', (req, res) => {
  const topics = globalLearningState.auto_analyze
  const snpSet = new Set()
  
  for (const topic of topics) {
    const config = TOPIC_SNP_MAPPINGS[topic]
    if (config?.snps) {
      config.snps.forEach(snp => snpSet.add(snp))
    }
  }
  
  res.json({
    topics,
    snps: Array.from(snpSet),
    topic_details: topics.map(t => ({
      id: t,
      ...TOPIC_SNP_MAPPINGS[t],
    })),
  })
})

// POST /api/learning/add-topic - Manually add a topic to auto-analyze
app.post('/api/learning/add-topic', (req, res) => {
  const { topic } = req.body
  
  if (!topic || !TOPIC_SNP_MAPPINGS[topic]) {
    return res.status(400).json({ 
      error: 'Invalid topic', 
      available: Object.keys(TOPIC_SNP_MAPPINGS) 
    })
  }
  
  if (!globalLearningState.auto_analyze.includes(topic)) {
    globalLearningState.auto_analyze.push(topic)
    saveLearningState()
  }
  
  res.json({ 
    success: true, 
    auto_analyze: globalLearningState.auto_analyze 
  })
})

// POST /api/learning/prepare-context - Prepare SNPedia context BEFORE sending to AI
// This fetches all relevant SNP data so it can be included in the AI prompt
app.post('/api/learning/prepare-context', async (req, res) => {
  const { question } = req.body
  
  if (!question) {
    return res.status(400).json({ error: 'Missing question' })
  }
  
  const detectedTopics = detectTopics(question)
  const detectedRsids = detectRsids(question)
  
  // Collect all SNPs: from detected topics + directly mentioned rsids
  const allSnps = new Set(detectedRsids)
  
  for (const topic of detectedTopics) {
    const config = TOPIC_SNP_MAPPINGS[topic]
    if (config?.snps) {
      config.snps.forEach(snp => allSnps.add(snp.toLowerCase()))
    }
    
    // Auto-add topic to learning
    if (!globalLearningState.auto_analyze.includes(topic)) {
      globalLearningState.auto_analyze.push(topic)
      console.log(`[Learning] New topic added: ${topic}`)
    }
  }
  
  // Fetch all SNPs that aren't cached yet (in parallel)
  const snpsToFetch = Array.from(allSnps)
  const fetchResults = await Promise.all(snpsToFetch.map(rsid => fetchAndCacheSnp(rsid)))
  
  // Load cached data for all SNPs
  const snpediaData = {}
  for (const rsid of snpsToFetch) {
    const cacheFile = path.join(SNPEDIA_CACHE_DIR, `${rsid}.json`)
    if (fs.existsSync(cacheFile)) {
      try {
        snpediaData[rsid] = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
      } catch (e) {
        console.warn(`[SNPedia] Failed to read cache for ${rsid}:`, e.message)
      }
    }
  }
  
  // Build context string for AI prompt
  let contextForAI = ''
  if (Object.keys(snpediaData).length > 0) {
    contextForAI = '\n\n=== SNPedia Reference Data ===\n'
    for (const [rsid, data] of Object.entries(snpediaData)) {
      contextForAI += `\n**${rsid}** (${data.gene || 'unknown gene'}):\n`
      contextForAI += `Summary: ${data.summary || 'No summary'}\n`
      if (data.genotypes && Object.keys(data.genotypes).length > 0) {
        contextForAI += 'Genotypes:\n'
        for (const [geno, info] of Object.entries(data.genotypes)) {
          contextForAI += `  - (${geno}): ${info.description || 'No description'}\n`
        }
      }
    }
    contextForAI += '\n=== End SNPedia Data ===\n'
  }
  
  // Update request count
  globalLearningState.total_requests++
  saveLearningState()
  
  const newlyCached = fetchResults.filter(r => r.fetched).length
  if (newlyCached > 0) {
    console.log(`[Learning] Cached ${newlyCached} new SNPs for question context`)
  }
  
  res.json({
    detected_topics: detectedTopics,
    detected_rsids: detectedRsids,
    all_snps: snpsToFetch,
    snpedia_data: snpediaData,
    context_for_ai: contextForAI,
    fetch_results: fetchResults,
    cached_count: Object.keys(snpediaData).length,
  })
})

// =============================================================================
// SNPEDIA PROXY & CACHE - Fetches and caches SNPedia data
// =============================================================================

const SNPEDIA_CACHE_DIR = path.join(__dirname, 'snpedia_cache')

// Ensure cache directory exists
if (!fs.existsSync(SNPEDIA_CACHE_DIR)) {
  fs.mkdirSync(SNPEDIA_CACHE_DIR, { recursive: true })
}

// Pre-seeded SNPedia data (canonical reference data)
const PRESEEDED_SNPEDIA = {
  rs12913832: {
    rsid: 'rs12913832',
    gene: 'HERC2',
    chromosome: '15',
    summary: 'Primary determinant of eye color. The A allele is associated with brown eyes, G allele with blue eyes.',
    genotypes: {
      'A;A': { description: 'Brown eyes (most common worldwide)' },
      'A;G': { description: 'Likely brown or hazel eyes' },
      'G;G': { description: 'Blue eyes likely' },
    },
    magnitude: 3,
  },
  rs1800407: {
    rsid: 'rs1800407',
    gene: 'OCA2',
    chromosome: '15',
    summary: 'Modifier of eye color. Can influence green/hazel eye color.',
    genotypes: {
      'C;C': { description: 'Normal OCA2 function' },
      'C;T': { description: 'Slightly reduced melanin, may contribute to lighter eyes' },
      'T;T': { description: 'Reduced melanin production, associated with blue/green eyes' },
    },
    magnitude: 2,
  },
  rs12821256: {
    rsid: 'rs12821256',
    gene: 'KITLG',
    chromosome: '12',
    summary: 'Associated with BLONDE hair color, NOT red hair. T allele linked to lighter hair.',
    genotypes: {
      'C;C': { description: 'Typical, darker hair more likely' },
      'C;T': { description: 'Carrier for blonde hair variant' },
      'T;T': { description: 'Blonde hair more likely (European ancestry)' },
    },
    magnitude: 2.5,
  },
  rs1805007: {
    rsid: 'rs1805007',
    gene: 'MC1R',
    chromosome: '16',
    summary: 'Red hair variant. One of the main MC1R mutations for red hair and fair skin.',
    genotypes: {
      'C;C': { description: 'Normal MC1R' },
      'C;T': { description: 'Carrier for red hair variant' },
      'T;T': { description: 'Red hair and fair skin likely' },
    },
    magnitude: 3,
  },
  rs4680: {
    rsid: 'rs4680',
    gene: 'COMT',
    chromosome: '22',
    summary: 'Val158Met polymorphism affecting dopamine breakdown. Warrior vs Worrier gene.',
    genotypes: {
      'A;A': { description: 'Met/Met - Worrier, higher dopamine, better memory but more stress sensitive' },
      'A;G': { description: 'Val/Met - Intermediate dopamine levels' },
      'G;G': { description: 'Val/Val - Warrior, lower dopamine, stress resilient but lower working memory' },
    },
    magnitude: 2.5,
  },
  rs762551: {
    rsid: 'rs762551',
    gene: 'CYP1A2',
    chromosome: '15',
    summary: 'Caffeine metabolism. Determines how fast you process caffeine.',
    genotypes: {
      'A;A': { description: 'Fast caffeine metabolizer - can handle more coffee' },
      'A;C': { description: 'Intermediate caffeine metabolism' },
      'C;C': { description: 'Slow caffeine metabolizer - caffeine stays longer, higher heart risk with coffee' },
    },
    magnitude: 2,
  },
  rs4988235: {
    rsid: 'rs4988235',
    gene: 'MCM6',
    chromosome: '2',
    summary: 'Lactase persistence. Determines ability to digest lactose in adulthood.',
    genotypes: {
      'A;A': { description: 'Lactase persistent - can digest milk as adult' },
      'A;G': { description: 'Lactase persistent - can digest milk as adult' },
      'G;G': { description: 'Lactose intolerant likely - reduced lactase production' },
    },
    magnitude: 2,
  },
  rs429358: {
    rsid: 'rs429358',
    gene: 'APOE',
    chromosome: '19',
    summary: 'Part of APOE genotype. Combined with rs7412 determines APOE2/3/4 status and Alzheimer risk.',
    genotypes: {
      'T;T': { description: 'Part of APOE2 or APOE3' },
      'C;T': { description: 'Heterozygous, one APOE4 allele' },
      'C;C': { description: 'APOE4/4 - significantly elevated Alzheimer risk' },
    },
    magnitude: 4,
  },
  rs7412: {
    rsid: 'rs7412',
    gene: 'APOE',
    chromosome: '19',
    summary: 'Part of APOE genotype. Combined with rs429358 determines APOE2/3/4 status.',
    genotypes: {
      'C;C': { description: 'Part of APOE3 or APOE4' },
      'C;T': { description: 'Heterozygous, one APOE2 allele' },
      'T;T': { description: 'APOE2/2 - protective against Alzheimer' },
    },
    magnitude: 3,
  },
  rs1801133: {
    rsid: 'rs1801133',
    gene: 'MTHFR',
    chromosome: '1',
    summary: 'C677T variant affecting folate metabolism. Important for methylation.',
    genotypes: {
      'C;C': { description: 'Normal MTHFR activity' },
      'C;T': { description: 'Reduced MTHFR activity (~65%)' },
      'T;T': { description: 'Significantly reduced MTHFR activity (~30%), may need methylfolate' },
    },
    magnitude: 2,
  },
  rs6025: {
    rsid: 'rs6025',
    gene: 'F5',
    chromosome: '1',
    summary: 'Factor V Leiden mutation. Most common inherited blood clotting disorder.',
    genotypes: {
      'C;C': { description: 'Normal Factor V' },
      'C;T': { description: 'Heterozygous Factor V Leiden - increased clot risk' },
      'T;T': { description: 'Homozygous Factor V Leiden - significantly increased clot risk' },
    },
    magnitude: 4,
  },
  rs17822931: {
    rsid: 'rs17822931',
    gene: 'ABCC11',
    chromosome: '16',
    summary: 'Determines earwax type (wet vs dry) and body odor. The T allele is associated with dry earwax and less body odor, common in East Asian populations.',
    genotypes: {
      'C;C': { description: 'Wet earwax, typical body odor (common in Europeans/Africans)' },
      'C;T': { description: 'Intermediate - likely wet earwax' },
      'T;T': { description: 'Dry earwax, reduced body odor (common in East Asians)' },
    },
    magnitude: 2,
  },
  rs1815739: {
    rsid: 'rs1815739',
    gene: 'ACTN3',
    chromosome: '11',
    summary: 'The "sprinter gene". Affects muscle fiber composition - power vs endurance.',
    genotypes: {
      'C;C': { description: 'Power/sprint athlete type - functional alpha-actinin-3' },
      'C;T': { description: 'Mixed muscle fiber type' },
      'T;T': { description: 'Endurance athlete type - no alpha-actinin-3 (common in elite endurance athletes)' },
    },
    magnitude: 2.5,
  },
  rs671: {
    rsid: 'rs671',
    gene: 'ALDH2',
    chromosome: '12',
    summary: 'Asian flush/alcohol intolerance. Affects ability to metabolize acetaldehyde from alcohol.',
    genotypes: {
      'G;G': { description: 'Normal alcohol metabolism' },
      'A;G': { description: 'Reduced ALDH2 activity - alcohol flush reaction, increased esophageal cancer risk with alcohol' },
      'A;A': { description: 'Very low ALDH2 activity - severe alcohol intolerance' },
    },
    magnitude: 3,
  },
  rs10490924: {
    rsid: 'rs10490924',
    gene: 'ARMS2',
    chromosome: '10',
    summary: 'Strong risk factor for age-related macular degeneration (AMD). The T allele significantly increases risk of vision loss in older age.',
    genotypes: {
      'G;G': { description: 'Normal risk for AMD' },
      'G;T': { description: 'Increased risk for AMD (~2.7x)' },
      'T;T': { description: 'High risk for AMD (~8x increased risk)' },
    },
    magnitude: 4,
  },
  rs1061170: {
    rsid: 'rs1061170',
    gene: 'CFH',
    chromosome: '1',
    summary: 'Complement factor H variant. Risk factor for age-related macular degeneration (AMD).',
    genotypes: {
      'T;T': { description: 'Lower AMD risk' },
      'C;T': { description: 'Intermediate AMD risk (~2.5x)' },
      'C;C': { description: 'Higher AMD risk (~5-7x)' },
    },
    magnitude: 3.5,
  },
  rs9939609: {
    rsid: 'rs9939609',
    gene: 'FTO',
    chromosome: '16',
    summary: 'The "obesity gene". Associated with increased BMI and appetite.',
    genotypes: {
      'T;T': { description: 'Lower obesity risk' },
      'A;T': { description: 'Slightly increased obesity risk' },
      'A;A': { description: 'Higher obesity risk (~1.7x), increased appetite' },
    },
    magnitude: 2.5,
  },
  rs1800497: {
    rsid: 'rs1800497',
    gene: 'ANKK1/DRD2',
    chromosome: '11',
    summary: 'Taq1A polymorphism. Affects dopamine receptor density, linked to addiction and reward sensitivity.',
    genotypes: {
      'C;C': { description: 'Normal dopamine receptor density' },
      'C;T': { description: 'Slightly reduced D2 receptors' },
      'T;T': { description: 'Reduced D2 receptors - may affect reward sensitivity, addiction risk' },
    },
    magnitude: 2.5,
  },
}

// Seed SNPedia cache on startup
function seedSnpediaCache() {
  let seeded = 0
  for (const [rsid, data] of Object.entries(PRESEEDED_SNPEDIA)) {
    const cacheFile = path.join(SNPEDIA_CACHE_DIR, `${rsid}.json`)
    if (!fs.existsSync(cacheFile)) {
      fs.writeFileSync(cacheFile, JSON.stringify({
        ...data,
        fetched_at: new Date().toISOString(),
        source: 'SNPedia (pre-seeded)',
      }, null, 2))
      seeded++
    }
  }
  return seeded
}

// GET /api/snpedia/:rsid - Fetch SNPedia data (cached)
app.get('/api/snpedia/:rsid', async (req, res) => {
  const rsid = req.params.rsid.toLowerCase()
  const cacheFile = path.join(SNPEDIA_CACHE_DIR, `${rsid}.json`)
  
  // Check cache first
  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
      console.log(`[SNPedia] Cache hit for ${rsid}`)
      return res.json(cached)
    } catch (e) {
      console.warn(`[SNPedia] Cache read error for ${rsid}:`, e.message)
    }
  }
  
  // Fetch from SNPedia
  try {
    console.log(`[SNPedia] Fetching ${rsid} from SNPedia...`)
    const url = `https://bots.snpedia.com/index.php/${rsid}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DNAChatApp/1.0 (genetic education tool)',
        'Accept': 'text/html',
      },
      timeout: 10000,
    })
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `SNPedia returned ${response.status}` })
    }
    
    const html = await response.text()
    
    // Parse basic info from HTML
    const parsed = parseSnpediaHtml(rsid, html)
    
    // Cache the result
    fs.writeFileSync(cacheFile, JSON.stringify(parsed, null, 2))
    console.log(`[SNPedia] Cached ${rsid}`)
    
    res.json(parsed)
  } catch (error) {
    console.error(`[SNPedia] Fetch error for ${rsid}:`, error.message)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/snpedia-cache/stats - Get cache statistics
app.get('/api/snpedia-cache/stats', (req, res) => {
  try {
    const files = fs.readdirSync(SNPEDIA_CACHE_DIR).filter(f => f.endsWith('.json'))
    res.json({
      cached_count: files.length,
      cache_dir: SNPEDIA_CACHE_DIR,
      cached_rsids: files.map(f => f.replace('.json', '')),
    })
  } catch (e) {
    res.json({ cached_count: 0, error: e.message })
  }
})

// Parse SNPedia HTML to extract structured data
function parseSnpediaHtml(rsid, html) {
  const result = {
    rsid,
    fetched_at: new Date().toISOString(),
    source: 'SNPedia',
    gene: null,
    chromosome: null,
    summary: '',
    genotypes: {},
    magnitude: null,
    raw_length: html.length,
  }
  
  // Helper to clean HTML tags and entities
  const cleanHtml = (str) => {
    return str
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&[a-z]+;/gi, ' ') // Remove HTML entities
      .replace(/\{\{[^}]+\}\}/g, '') // Remove wiki templates
      .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2$1') // Clean wiki links
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  // Extract gene name from various patterns
  const genePatterns = [
    /Gene\s*[=:]\s*\[\[([A-Z0-9]+)\]\]/i,
    /gene["\s:=]+([A-Z][A-Z0-9]{1,10})/i,
    /title="([A-Z][A-Z0-9]{1,10})\s*\(gene\)"/i,
    /<td[^>]*>Gene<\/td>\s*<td[^>]*>([A-Z0-9]+)/i,
  ]
  for (const pattern of genePatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      result.gene = match[1]
      break
    }
  }
  
  // Extract chromosome
  const chrPatterns = [
    /Chromosome\s*[=:]\s*(\d+|X|Y)/i,
    /chromosome["\s:=]+(\d+|X|Y)/i,
    /<td[^>]*>Chromosome<\/td>\s*<td[^>]*>(\d+|X|Y)/i,
  ]
  for (const pattern of chrPatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      result.chromosome = match[1]
      break
    }
  }
  
  // Extract summary from page content - look for meaningful text
  // First, try to find text in the main content area
  const contentMatch = html.match(/class="mw-parser-output">([\s\S]*?)<div/i)
  if (contentMatch) {
    // Extract all paragraph text
    const paragraphs = contentMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []
    for (const p of paragraphs) {
      let text = cleanHtml(p)
      // Skip short text, rsid references, and template garbage
      if (text.length > 30 && 
          !text.toLowerCase().startsWith('rs') && 
          !text.includes('PMID') &&
          !text.includes('{{') &&
          !text.includes('redirect')) {
        result.summary = text.substring(0, 500)
        break
      }
    }
  }
  
  // Fallback: try to extract from table cells or other content
  if (!result.summary) {
    const tableMatch = html.match(/summary[^>]*>([^<]{30,500})/i)
    if (tableMatch) {
      result.summary = cleanHtml(tableMatch[1]).substring(0, 500)
    }
  }
  
  // Extract genotype links and their meanings
  const genotypeLinks = html.match(/Rs\d+\([ACGT];[ACGT]\)/gi) || []
  const uniqueGenotypes = [...new Set(genotypeLinks.map(g => {
    const m = g.match(/\(([ACGT]);([ACGT])\)/i)
    return m ? `${m[1]};${m[2]}` : null
  }).filter(Boolean))]
  
  for (const geno of uniqueGenotypes) {
    // Try to find description near this genotype
    const genoRegex = new RegExp(`\\(${geno.replace(';', ';')}\\)[^<]*?([^<]{10,200})`, 'i')
    const descMatch = html.match(genoRegex)
    if (descMatch) {
      const desc = cleanHtml(descMatch[1])
      if (desc.length > 5 && !desc.startsWith('"')) {
        result.genotypes[geno] = { description: desc.substring(0, 200) }
      }
    }
    // If no description found, at least record the genotype exists
    if (!result.genotypes[geno]) {
      result.genotypes[geno] = { description: 'See SNPedia for details' }
    }
  }
  
  // Extract magnitude if present
  const magPatterns = [
    /[Mm]agnitude\s*[=:]\s*(\d+\.?\d*)/i,
    /magnitude["\s:=]+(\d+\.?\d*)/i,
  ]
  for (const pattern of magPatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      result.magnitude = parseFloat(match[1])
      break
    }
  }
  
  return result
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
  console.log(`Azure deployment: ${AZURE_DEPLOYMENT}`)
  
  // Seed SNPedia cache with important SNPs
  const seeded = seedSnpediaCache()
  if (seeded > 0) {
    console.log(`[SNPedia] Seeded ${seeded} new SNPs to cache`)
  }
  
  // Log SNPedia cache stats
  try {
    const cached = fs.readdirSync(SNPEDIA_CACHE_DIR).filter(f => f.endsWith('.json')).length
    console.log(`SNPedia cache: ${cached} SNPs cached`)
  } catch (e) {}
  
  console.log(`Auto-analyze topics: ${globalLearningState.auto_analyze.join(', ')}`)
})
