import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/menus_comidas/', // Configured for GitHub pages if repo name is menus_comidas
})
