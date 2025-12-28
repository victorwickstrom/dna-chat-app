### Task 6: Initialize TypeScript configuration.

1. Create a `tsconfig.json` in the project root using the TypeScript CLI:
   ```bash
   npx tsc --init
   ```
2. Edit `tsconfig.json` to include settings suitable for a React + Vite project:
   ```json
   {
     "compilerOptions": {
       "target": "ESNext",
       "module": "ESNext",
       "lib": ["DOM", "DOM.Iterable", "ESNext"],
       "allowJs": false,
       "skipLibCheck": true,
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true,
       "strict": true,
       "forceConsistentCasingInFileNames": true,
       "noEmit": true,
       "isolatedModules": true,
       "jsx": "react-jsx",
       "moduleResolution": "node",
       "resolveJsonModule": true,
       "types": ["jest", "node"]
     },
     "include": ["src"],
     "exclude": ["node_modules", "dist"]
   }
   ```
   This configuration enables strict type checking, supports React's modern JSX runtime, and excludes build artifacts from compilation.
