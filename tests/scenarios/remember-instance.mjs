import assert from 'node:assert/strict'
import { connectInstance } from '../helpers/session.mjs'

const storageKey = 'likeamax.remembered-instance'

export async function checkRememberInstance(page, api, origin) {
    await page.goto(origin)
    assert.equal(await page.getByRole('checkbox', { name: 'Запомнить меня' }).isChecked(), false)
    await page.getByText(/Небезопасно: токен сохраняется/).waitFor()

    // Обычный вход не должен переживать перезагрузку или оставлять токен на диске.
    await connectInstance(page, origin)
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), storageKey), null)
    await page.reload()
    await page.getByRole('button', { name: 'Подключиться' }).waitFor()

    await connectInstance(page, origin, true)
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)
    assert.deepEqual(saved, {
        apiUrl: 'https://4100.api.green-api.com',
        idInstance: '4100000000',
        apiTokenInstance: 'test-token',
    })
    await page.reload()
    await page.getByRole('button', { name: 'Выйти' }).waitFor()
    await page.getByRole('button', { name: /Избранное/ }).waitFor()
    await page.getByRole('button', { name: 'Выйти' }).click()
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), storageKey), null)
    await page.reload()
    await page.getByRole('button', { name: 'Подключиться' }).waitFor()

    // Отозванный токен не должен приводить к циклу восстановления входа.
    await connectInstance(page, origin, true)
    api.badToken = true
    await page.reload()
    await page.getByRole('alert').filter({ hasText: 'Не удалось восстановить вход' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Подключиться' }).isEnabled(), true)
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), storageKey), null)
    api.badToken = false

    // Повреждение JSON не должно ломать запуск приложения.
    await page.evaluate((key) => localStorage.setItem(key, '{broken'), storageKey)
    await page.reload()
    await page.getByRole('button', { name: 'Подключиться' }).waitFor()
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), storageKey), null)
}
