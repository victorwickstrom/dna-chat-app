### Task 95: Verify system functions end-to-end.

1. After implementing all tasks, perform a manual test:
   - Start the development server (`npm run dev`).
   - Upload a sample DNA file using the FileUpload component. Verify progress updates and see the summary.
   - Ask several questions about different topics. Confirm that the planner returns appropriate SNP lists and that the interpreter returns formatted answers.
   - Test safety features by asking a diagnostic question and a question containing an email address; verify that safe messages are displayed.
   - Try toggling languages, adjusting preferences, and confirming genotype sending behaviour.
   - View the Memory Overview page and confirm that topics and genes accumulate.
   - Reset memory and verify that topics reset.
   - Export memory, import it again, and confirm data persists.
2. Fix any bugs uncovered in these tests before considering the implementation complete.
