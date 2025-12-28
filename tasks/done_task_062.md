### Task 62: Add genotype auto-send preference and confirmation logic.

1. In user preferences (see Task 51), include the boolean `autoSendGenotypes`. Default it to `false`.
2. When matching the QueryPlan to the local index (Task 41), if `autoSendGenotypes` is false, prepare the list of genotypes but do not send to the interpreter yet.
3. Display a confirmation modal with the list of SNP IDs and genotypes. Provide two buttons: Send and Cancel.
4. If the user clicks Send, proceed to build the interpreter prompt and call the interpreter. If Cancel, abort and display a message indicating the call was cancelled.
5. If `autoSendGenotypes` is true, skip the confirmation modal and send directly.
