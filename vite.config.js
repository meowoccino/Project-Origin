import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // THIS IS THE CRITICAL FIX FOR GITHUB PAGES
  server: {
    host: true,
    port: 3000
  }
});
