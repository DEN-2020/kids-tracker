import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Замени 'kids-tracker' на точное имя твоего репозитория на GitHub
  base: '/kids-tracker/', 
})