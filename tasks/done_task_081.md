### Task 81: Configure continuous integration workflow.

1. In `.github/workflows/test.yml`, define a workflow to run on `push` and `pull_request`:
   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - name: Install dependencies
           run: npm ci
         - name: Run tests
           run: npm test
   ```
2. Commit this file to version control. This ensures that your tests are automatically executed for every commit and pull request, preventing regressions.
