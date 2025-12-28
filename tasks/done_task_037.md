### Task 37: Create API service functions for the Planner.

1. In `src/services/llm.ts`, implement `async function callPlanner(prompt: string): Promise<QueryPlan>`:
   - Read the endpoint URL from `import.meta.env.VITE_LLM_PLANNER_ENDPOINT`. Ensure this environment variable is defined in `.env.local`.
   - Make a POST request with a JSON body containing the prompt and any other required parameters (e.g., max tokens or temperature). Example:
     ```ts
     const response = await fetch(import.meta.env.VITE_LLM_PLANNER_ENDPOINT, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({ prompt }),
     })
     ```
   - Check `response.ok`. If not ok, throw an error.
   - Parse the JSON response. Expect a field like `choices[0].message.content` that contains the planner's output.
   - Parse the content as JSON into a `QueryPlan`. Validate it using `validateQueryPlan` (Task 45).
2. Ensure you handle any fetch errors by catching exceptions and propagating them to the calling component.
