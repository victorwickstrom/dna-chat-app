### Task 77: Write tests for Chat UI interactions.

1. Create `src/tests/chat.test.tsx`.
2. Use `@testing-library/react` to render the `Chat` component with a mocked context provider supplying an empty `snpIndex`.
3. Simulate user typing and pressing Enter or clicking the Send button using `user-event`.
4. Assert that a new user message appears in the chat. Mock `callPlanner` and `callInterpreter` to return stub data and assert that system messages are appended accordingly.
5. Use `await waitFor()` to handle asynchronous updates in the component.
