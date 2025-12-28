### Task 66: Set up Jest and React Testing Library configuration.

1. Create `jest.config.js` in the project root with:
   ```js
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'jsdom',
     moduleNameMapper: {
       '^@/(.*)$': '<rootDir>/src/$1',
     },
     transform: {
       '^.+\.tsx?$': 'ts-jest',
     },
     setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.ts'],
   }
   ```
2. Create `src/tests/setupTests.ts` to import necessary testing utilities:
   ```ts
   import '@testing-library/jest-dom'
   ```
3. Configure TypeScript for tests by ensuring `tsconfig.json` includes `"types": ["jest"]`.
4. Write a sample test in `src/tests/sample.test.ts` to assert that Jest is working:
   ```ts
   test('sanity test', () => {
     expect(1 + 1).toBe(2)
   })
   ```
5. Run tests with:
   ```bash
   npm test
   ```
