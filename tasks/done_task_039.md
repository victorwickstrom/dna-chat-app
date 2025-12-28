### Task 39: Create a JSON schema for QueryPlan and validation function.

1. Add `src/models/queryPlan.schema.json` containing the JSON Schema that mirrors the `QueryPlan` interface. For example:
   ```json
   {
     "$schema": "http://json-schema.org/draft-07/schema#",
     "type": "object",
     "required": ["version", "intent", "topic", "snps", "includeNotes", "safety"],
     "properties": {
       "version": { "type": "string" },
       "intent": { "type": "string" },
       "topic": { "type": "string" },
       "snps": {
         "type": "array",
         "items": {
           "type": "object",
           "required": ["rsid", "gene", "reason", "evidence", "priority"],
           "properties": {
             "rsid": { "type": "string" },
             "gene": { "type": "string" },
             "reason": { "type": "string" },
             "evidence": { "enum": ["weak", "moderate", "strong"] },
             "priority": { "type": "number" }
           }
         }
       },
       "includeNotes": {
         "type": "array",
         "items": { "type": "string" }
       },
       "safety": {
         "type": "object",
         "required": ["diagnosis", "medicalAdvice", "disclaimerLevel"],
         "properties": {
           "diagnosis": { "type": "boolean" },
           "medicalAdvice": { "type": "boolean" },
           "disclaimerLevel": { "enum": ["none", "low", "medium", "high"] }
         }
       }
     }
   }
   ```
2. Create `src/utils/validateQueryPlan.ts` that imports `Ajv` from `ajv` and the schema. Compile the schema once and export a function `validateQueryPlan(data: any): asserts data is QueryPlan` that throws an error if the data does not conform.
3. Use this validation in `callPlanner` before returning the plan.
