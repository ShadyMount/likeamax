import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import deployment from './vercel.json' with { type: 'json' }

export default defineConfig({
    plugins: [react()],
    // Preview и браузерные тесты используют те же заголовки, что и публикация на Vercel.
    // Dev-сервер остаётся без CSP: HMR требует дополнительных разрешений на скрипты и соединения.
    preview: {
        headers: Object.fromEntries(
            deployment.headers[0].headers.map(({ key, value }) => [key, value]),
        ),
    },
})
