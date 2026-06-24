import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5173,
		// No proxy — /api/* routes are handled by SvelteKit +server.ts files
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
	},
});
