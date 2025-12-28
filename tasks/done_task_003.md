### Task 3: Install runtime dependencies.

Install the libraries needed at runtime for the application. Use the following command to install them via NPM:

```bash
npm install react react-dom jszip pako idb i18next react-i18next @shadcn/ui
```

- **react** and **react-dom**: Core libraries for building the frontend.
- **jszip**: For extracting `.zip` files in the browser.
- **pako**: For decompressing `.gz` (gzip) files in the browser.
- **idb**: A tiny library that simplifies IndexedDB usage for local storage.
- **i18next** and **react-i18next**: For multi-language support.
- **@shadcn/ui**: Provides prebuilt, accessible UI components that follow your style guides.
  Ensure the command finishes without errors; these dependencies will be imported in your source code.
