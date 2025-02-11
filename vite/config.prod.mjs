import { defineConfig } from 'vite';
import { viteSingleFile } from "vite-plugin-singlefile"
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from "url";
import { base64ToGzippedBase122, base64ToBrotliBase122 } from "./base122.ts";

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

const base122Plugin = {
    name: 'vite-plugin-base122-images',
    enforce: 'post',
    generateBundle(options, bundle) {
      for (const fileName in bundle) {
        const file = bundle[fileName];
        if (file.type === 'asset' && file.fileName.endsWith('.html')) {
          let html = file.source.toString();
          let resources = [];
          html = html.replace(
            /this\.load\.image\("[^"]+",\s*"data:image\/png;base64,([^"]+)"\)/g,
            (match, base64Data) => {
              console.log(match);
              const imageName = match.match(/this\.load\.image\("([^"]+)"/)[1];
              resources.push(base64ToGzippedBase122(base64Data));
              return `this.load.image("${imageName}", decodeBase122(${resources.length - 1}))`;
            }
          );
          html = html.replace(
            /<script data-content=""><\/script>/,
            (_, content) => {
              return resources.map((r, index) => {
                return `<script id="data-content-${index}" data-content="${r}"></script>`
              }).join("");
            }
          );
          file.source = html;
        }
      }
    }
}

export default defineConfig({
    base: './',
    plugins: [
        react(),
        phasermsg(),
        viteSingleFile(),
        base122Plugin
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
    },
    assetsInclude: ['**/*.gltf', '**/*.glb', "**/*.mpeg"]
});
