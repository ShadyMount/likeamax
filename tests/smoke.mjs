import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { mockGreenApi } from './helpers/green-api-mock.mjs'
import { checkConnectionAndHistory, checkChatCreationAndSending } from './scenarios/connection.mjs'
import { checkNotificationsAndStatuses, checkDraftsAndTextInput } from './scenarios/messages.mjs'
import { checkMessageOrder } from './scenarios/message-order.mjs'
import { checkBotMessages } from './scenarios/bot-messages.mjs'
import { checkSearchAndDateSeparators, checkMobileAndLogout } from './scenarios/interface.mjs'

import { checkRememberInstance } from './scenarios/remember-instance.mjs'
import { checkSecurityPolicy } from './scenarios/security.mjs'
import { checkSavedMessages } from './scenarios/saved-messages.mjs'

// Каждый сценарий получает новую страницу, отдельную сессию и собственную очередь API.
const scenarios = [
    { id: 'security', run: checkSecurityPolicy },
    { id: 'remember', run: checkRememberInstance },
    { id: 'saved', run: checkSavedMessages },
    { id: 'connection', run: checkConnectionAndHistory },
    { id: 'sending', run: checkChatCreationAndSending },
    { id: 'notifications', run: checkNotificationsAndStatuses },
    { id: 'drafts', run: checkDraftsAndTextInput },
    { id: 'message-order', run: checkMessageOrder },
    { id: 'bots', run: checkBotMessages },
    { id: 'search', run: (page, api, origin) => checkSearchAndDateSeparators(page, origin) },
    { id: 'mobile', run: checkMobileAndLogout },
]
const requested = process.argv.slice(2)
for (const id of requested) {
    if (!scenarios.some((scenario) => scenario.id === id)) {
        throw new Error(
            `Неизвестный сценарий «${id}». Доступны: ${scenarios.map((item) => item.id).join(', ')}`,
        )
    }
}
const selected = requested.length
    ? requested.map((id) => scenarios.find((scenario) => scenario.id === id))
    : scenarios

const origin = 'http://127.0.0.1:5174'
const server = spawn(
    process.execPath,
    [
        'node_modules/vite/bin/vite.js',
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        '5174',
        '--strictPort',
    ],
    { stdio: 'pipe' },
)
let browser
try {
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(
            () => reject(new Error('Истекло время ожидания запуска Vite')),
            15000,
        )
        server.stdout.on('data', (data) => {
            if (data.toString().includes('5174')) {
                clearTimeout(timeout)
                resolve()
            }
        })
        server.on('error', reject)
        server.on('exit', (code) => {
            clearTimeout(timeout)
            reject(new Error(`Vite завершился с кодом: ${code}`))
        })
    })
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    })
    for (const scenario of selected) {
        const context = await browser.newContext()
        try {
            const page = await context.newPage()
            page.setDefaultTimeout(7000)
            const errors = []
            page.on('pageerror', (error) => errors.push(error.message))
            const api = await mockGreenApi(page)
            await scenario.run(page, api, origin)
            assert.deepEqual(errors, [])
            console.log(`PASS: ${scenario.id}`)
        } catch (error) {
            console.error(`FAIL: ${scenario.id}`, error)
            process.exitCode = 1
        } finally {
            await context.close()
        }
    }
} finally {
    await browser?.close()
    server.kill()
}
