### Task 4: Install development dependencies.

Install tools that assist in development but are not included in the production bundle:

```bash
npm install --save-dev typescript vite @vitejs/plugin-react tailwindcss postcss autoprefixer @types/react @types/react-dom jest ts-jest @types/jest @testing-library/react @testing-library/jest-dom @testing-library/user-event eslint prettier eslint-plugin-react eslint-config-prettier eslint-plugin-react-hooks @testing-library/react-hooks ts-node ajv
```

- **typescript**: Provides static typing.
- **vite** and **@vitejs/plugin-react**: Bundler and dev server with hot reloading.
- **tailwindcss**, **postcss**, **autoprefixer**: Utility-first CSS framework and processors.
- **@types/react** and **@types/react-dom**: Type definitions for React.
- **jest**, **ts-jest**, **@types/jest**: Testing framework and TypeScript integration.
- **@testing-library/react** and related packages: For testing React components.
- **eslint**, **prettier** and plugins: For code linting and formatting.
- **ts-node**: To execute TS files directly when needed.
- **ajv**: JSON schema validator used later for validating QueryPlan objects.
  This ensures your development environment is equipped for building, testing and formatting your code.
