### Task 7: Initialize Tailwind CSS and PostCSS configuration.

1. Run the Tailwind initializer to generate `tailwind.config.js` and `postcss.config.js`:
   ```bash
   npx tailwindcss init -p
   ```
2. Update `tailwind.config.js` to include all source files for purging unused styles by setting the `content` array:
   ```js
   // tailwind.config.js
   module.exports = {
     content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```
3. Ensure `postcss.config.js` contains `tailwindcss` and `autoprefixer` plugins:
   ```js
   // postcss.config.js
   module.exports = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   }
   ```
4. Create `src/styles/index.css` (or `src/index.css`):
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
   This file will be imported in your entrypoint to apply Tailwind styles globally.
