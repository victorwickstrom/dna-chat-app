### Task 91: Set up ESLint and Prettier for code quality.

1. Create `.eslintrc.json` in the project root with rules for TypeScript and React. For example:
   ```json
   {
     "env": {
       "browser": true,
       "es2021": true,
       "node": true
     },
     "extends": [
       "eslint:recommended",
       "plugin:react/recommended",
       "plugin:@typescript-eslint/recommended",
       "prettier"
     ],
     "parser": "@typescript-eslint/parser",
     "parserOptions": {
       "ecmaFeatures": { "jsx": true },
       "ecmaVersion": 12,
       "sourceType": "module"
     },
     "plugins": ["react", "@typescript-eslint"],
     "settings": {
       "react": { "version": "detect" }
     },
     "rules": {
       "react/prop-types": "off",
       "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
     }
   }
   ```
2. Create `.prettierrc` with basic formatting rules:
   ```json
   {
     "singleQuote": true,
     "semi": false,
     "trailingComma": "es5",
     "printWidth": 100
   }
   ```
3. Install eslint plugins as needed (already installed in Task 4). Optionally set up a pre-commit hook using `husky` and `lint-staged` to run ESLint and Prettier automatically.
4. Add NPM scripts in `package.json` to run linting and formatting:
   ```json
   {
     "scripts": {
       "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
       "format": "prettier --write ."
     }
   }
   ```
