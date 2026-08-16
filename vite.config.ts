import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    server: {
        host: true,
        port: 5173
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(process.cwd(), 'index.html'),
                about: resolve(process.cwd(), 'about.html')
            }
        }
    }
});
