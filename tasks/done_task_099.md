### Task 99: Implement Dark Mode support.

1. Configure Tailwind to use the `dark` mode class strategy by adding `darkMode: 'class'` in `tailwind.config.js`.
2. Create a toggle in user preferences (Task 51) for enabling dark mode. Store the preference in the `preferences` store.
3. Add a `className` binding on the `<body>` element in `index.html` or at the top-level React component that applies `dark` when dark mode is enabled.
4. Define custom colors for dark mode in the Tailwind theme if the default palette is insufficient.
5. Ensure all components respect dark mode by using `dark:bg-gray-800`, `dark:text-gray-200`, etc. Test readability in both modes.
