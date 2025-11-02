import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    plugins: [
        vue(),
        viteStaticCopy({
            targets: [
                {
                    // Копируем все wasm и mjs файлы
                    src: 'node_modules/onnxruntime-web/dist/*.{wasm,mjs}',
                    dest: '.' // В корень папки public
                }
            ]
        })
    ],
    // Опционально, но может помочь избежать проблем с кэшированием в браузере
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
    },
})
