import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    tsconfig: './tsconfig.test.json',
  },
} as Parameters<typeof defineConfig>[0])
