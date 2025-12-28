### Task 84: Document JSON schemas and API responses.

1. Create `docs/schemas.md` to define the shapes of the key JSON objects:
   - **QueryPlan**: List all fields with types and descriptions. Include an example plan.
   - **MatchResult**: Describe how each `rsid` maps to a genotype and evidence level.
   - **InterpreterResponse**: Document each property returned by the interpreter (answer_markdown, key_points, etc.) and include an example JSON.
2. Explain how these schemas are validated using Ajv and where the code resides.
