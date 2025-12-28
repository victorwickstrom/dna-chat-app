### Task 12: Set up the base HTML file for Vite.

1. Create an `index.html` in the project root if it doesn't already exist. Vite uses this file as the entry point:
   ```html
   <!DOCTYPE html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>DNA Chat Assistant</title>
     </head>
     <body class="bg-gray-50">
       <div id="root"></div>
       <!-- Vite will inject compiled JS here -->
       <script type="module" src="/src/main.tsx"></script>
     </body>
   </html>
   ```
2. Vite will automatically inject your bundled JavaScript into the `script` tag you specify.
