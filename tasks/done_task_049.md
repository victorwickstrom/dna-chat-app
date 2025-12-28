### Task 49: Create a confirmation dialog for sending genotypes.

1. When a user sends a question, and preferences indicate `autoSendGenotypes` is `false`, prepare the `MatchResult` but do not call the interpreter yet.
2. Display a modal dialog listing each `rsid` and genotype that will be sent. Ask the user to confirm or cancel.
3. If confirmed, proceed to build and send the interpreter prompt. If canceled, discard the call and allow the user to modify their question or preferences.
4. Consider using a component from @shadcn/ui (e.g., `Dialog`) for consistent styling and accessibility.
