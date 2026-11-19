import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'YTPT_')
	const apiUrl = process.env.YTPT_API_URL || env.YTPT_API_URL || 'http://127.0.0.1:8000'
	const proxy = { '/api': { target: apiUrl, changeOrigin: false } }

	return {
		plugins: [react(), tailwindcss()],
		server: { proxy },
		preview: { proxy },
		test: {
			environment: 'jsdom',
			setupFiles: ['./src/test/setup.ts'],
			include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.mjs'],
			css: false,
		},
	}
})
