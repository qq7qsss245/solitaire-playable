import { defineConfig } from 'vite';
import { viteSingleFile } from "vite-plugin-singlefile"
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from "url";


const phasermsg = () => {
    return {
        name: 'phasermsg',
        buildStart() {
            process.stdout.write(`Building for production...\n`);
        },
        buildEnd() {
            const line = "---------------------------------------------------------";
            const msg = `❤️❤️❤️ Tell us about your game! - games@phaser.io ❤️❤️❤️`;
            process.stdout.write(`${line}\n${msg}\n${line}\n`);

            process.stdout.write(`✨ Done ✨\n`);
        }
    }
}

export default defineConfig({
    base: './',
    plugins: [
        react(),
        phasermsg(),
        viteSingleFile(),
    ],
    resolve: {
        alias: [
            {find: '@', replacement: fileURLToPath(new URL('../src', import.meta.url))}
        ]
    },
    logLevel: 'warning',
    build: {
        minify: 'terser',
        terserOptions: {
            compress: {
                passes: 2
            },
            mangle: true,
            format: {
                comments: false
            }
        }
    }
});
