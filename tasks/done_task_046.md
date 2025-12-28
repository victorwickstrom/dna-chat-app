### Task 46: Define the InterpreterResponse interface.

1. In `src/models/InterpreterResponse.ts`, define:

   ```ts
   export interface UsedSnp {
     rsid: string
     genotype: string | null
     evidence: 'weak' | 'moderate' | 'strong'
   }

   export interface InterpreterResponse {
     answer_markdown: string
     key_points: string[]
     uncertainty: 'low' | 'medium' | 'high'
     used_snps: UsedSnp[]
     what_this_does_not_mean: string[]
     follow_up_questions: string[]
   }
   ```

2. Use this type when parsing and displaying interpreter responses in the UI.
