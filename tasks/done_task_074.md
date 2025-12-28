### Task 74: Write tests for QueryPlan validation logic.

1. Create `src/tests/queryPlanValidation.test.ts`.
2. Import `validateQueryPlan` from `src/utils/validateQueryPlan`.
3. Create a valid `QueryPlan` object and expect that calling `validateQueryPlan(validPlan)` does not throw.
4. Create invalid plans (e.g., missing required properties or wrong types) and expect that `validateQueryPlan` throws an error.
5. Use Jest's `toThrow` assertions to test for validation errors.
