import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/menu_inteligente/', // Configured for GitHub pages repository name 'menu_inteligente'
})
