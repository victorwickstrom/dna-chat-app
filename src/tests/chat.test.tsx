/**
 * Note: These tests require proper mocking of the LLM service and context.
 * For full testing, configure Jest with jsdom and mock the services.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chat from '../components/Chat'
import { GlobalProvider } from '../context/AppContext'

// Mock LLM services
jest.mock('../services/llm', () => ({
  callPlanner: jest.fn().mockResolvedValue({
    version: '1.0',
    intent: 'test',
    topic: 'test',
    snps: [],
    includeNotes: [],
    safety: { diagnosis: false, medicalAdvice: false, disclaimerLevel: 'low' },
  }),
  callInterpreter: jest.fn().mockResolvedValue({
    answer_markdown: 'Test response',
    key_points: ['Point 1'],
    uncertainty: 'low',
    used_snps: [],
    what_this_does_not_mean: 'Not a diagnosis',
    follow_up_questions: [],
  }),
}))

const renderChat = () => {
  return render(
    <GlobalProvider>
      <Chat />
    </GlobalProvider>
  )
}

describe('Chat component', () => {
  it('should render input field', () => {
    renderChat()

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('should render send button', () => {
    renderChat()

    const button = screen.getByRole('button', { name: /skicka/i })
    expect(button).toBeInTheDocument()
  })

  it('should add user message when sending', async () => {
    const user = userEvent.setup()
    renderChat()

    const input = screen.getByRole('textbox')
    await user.type(input, 'Test question')

    const button = screen.getByRole('button', { name: /skicka/i })
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('Test question')).toBeInTheDocument()
    })
  })

  it('should clear input after sending', async () => {
    const user = userEvent.setup()
    renderChat()

    const input = screen.getByRole('textbox') as HTMLInputElement
    await user.type(input, 'Test question')

    const button = screen.getByRole('button', { name: /skicka/i })
    await user.click(button)

    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('should not send empty messages', async () => {
    const user = userEvent.setup()
    renderChat()

    const button = screen.getByRole('button', { name: /skicka/i })
    await user.click(button)

    // Should not add any messages
    const messages = screen.queryAllByRole('article')
    expect(messages.length).toBe(0)
  })

  it('should send message on Enter key', async () => {
    const user = userEvent.setup()
    renderChat()

    const input = screen.getByRole('textbox')
    await user.type(input, 'Test question{enter}')

    await waitFor(() => {
      expect(screen.getByText('Test question')).toBeInTheDocument()
    })
  })
})
