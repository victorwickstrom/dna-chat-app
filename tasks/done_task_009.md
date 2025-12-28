### Task 9: Create the React entry point and render the application.

1. Create `src/main.tsx` and import React, ReactDOM, and global styles:

   ```tsx
   import React from 'react'
   import ReactDOM from 'react-dom/client'
   import App from './App'
   import './styles/index.css'

   ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
     <React.StrictMode>
       <App />
     </React.StrictMode>
   )
   ```

2. Ensure that the global CSS file (`index.css`) imports Tailwind directives as defined in Task 7.
