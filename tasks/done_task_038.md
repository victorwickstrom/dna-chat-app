### Task 38: Define the QueryPlan TypeScript interface.

1. In `src/models/QueryPlan.ts`, define and export the interface:
   ```ts
   export interface QueryPlan {
     version: string
     intent: string
     topic: string
     snps: {
       rsid: string
       gene: string
       reason: string
       evidence: 'weak' | 'moderate' | 'strong'
       priority: number
     }[]
     includeNotes: string[]
     safety: {
       diagnosis: boolean
       medicalAdvice: boolean
       disclaimerLevel: 'none' | 'low' | 'medium' | 'high'
     }
   }
   ```
2. This interface should match the schema defined in Task 44.
3. Use this type when validating and working with the planner's output.
