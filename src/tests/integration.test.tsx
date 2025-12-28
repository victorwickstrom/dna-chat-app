/**
 * Integration tests for end-to-end chat flow.
 * Requires msw (Mock Service Worker) for mocking API responses.
 * Install: npm install msw --save-dev
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { GlobalProvider } from '../context/AppContext'

// Mock LLM services
jest.mock('../services/llm', () => ({
  callPlanner: jest.fn().mockResolvedValue({
    version: '1.0',
    intent: 'explore_gene',
    topic: 'metabolism',
    snps: [
      {
        rsid: 'rs123',
        gene: 'FTO',
        reason: 'Associated with metabolism',
        evidence: 'moderate',
        priority: 1,
      },
    ],
    includeNotes: [],
    safety: { diagnosis: false, medicalAdvice: false, disclaimerLevel: 'low' },
  }),
  callInterpreter: jest.fn().mockResolvedValue({
    answer_markdown: '## Metabolism Analysis\n\nBased on your genetic data...',
    key_points: ['FTO gene variant detected', 'Associated with metabolism'],
    uncertainty: 'moderate',
    used_snps: ['rs123'],
    what_this_does_not_mean: 'This is not a diagnosis',
    follow_up_questions: ['What about diet?'],
  }),
}))

// Mock storage
jest.mock('../storage', () => ({
  ...jest.requireActual('../storage'),
  loadSNPIndex: jest.fn().mockResolvedValue({
    index: new Map([['rs123', 'AT']]),
    metadata: {
      vendor: '23andme',
      fileName: 'test.txt',
      count: 1,
      hash: 'abc',
      uploadDate: '2024-01-01',
    },
  }),
  saveSNPIndex: jest.fn().mockResolvedValue(undefined),
  loadPreferences: jest.fn().mockResolvedValue({
    explanationLevel: 'normal',
    tone: 'calm',
    showUncertainty: true,
    language: 'sv',
    autoSendGenotypes: true,
  }),
  savePreferences: jest.fn().mockResolvedValue(undefined),
}))

const renderApp = () => {
  return render(
    <GlobalProvider>
      <App />
    </GlobalProvider>
  )
}

describe('End-to-end chat flow', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render the app with header', () => {
    renderApp()

    expect(screen.getByText('DNA Chat Assistant')).toBeInTheDocument()
  })

  it('should display chat input', () => {
    renderApp()

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('should send a question and display user message', async () => {
    const user = userEvent.setup()
    renderApp()

    const input = screen.getByRole('textbox')
    await user.type(input, 'What does my DNA say about metabolism?')

    const sendButton = screen.getByRole('button', { name: /skicka/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('What does my DNA say about metabolism?')).toBeInTheDocument()
    })
  })

  it('should display system response after sending question', async () => {
    const user = userEvent.setup()
    renderApp()

    const input = screen.getByRole('textbox')
    await user.type(input, 'Test question')

    const sendButton = screen.getByRole('button', { name: /skicka/i })
    await user.click(sendButton)

    await waitFor(
      () => {
        // Check for response content
        expect(screen.getByText(/Metabolism Analysis/i)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it('should show language switcher', () => {
    renderApp()

    expect(screen.getByText('SV')).toBeInTheDocument()
    expect(screen.getByText('EN')).toBeInTheDocument()
  })

  it('should show settings button', () => {
    renderApp()

    const settingsButton = screen.getByRole('button', { name: /⚙️/i })
    expect(settingsButton).toBeInTheDocument()
  })
})
