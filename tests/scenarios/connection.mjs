import assert from 'node:assert/strict'
import { connectInstance } from '../helpers/session.mjs'

export async function checkConnectionAndHistory(page, api, origin) {
    api.badToken = true
    api.failChats = true
    api.failHistory = true
    await page.goto(origin)
    await page.getByLabel('ID инстанса').fill('4100000000')
    await page.getByLabel('Токен инстанса').fill('test-token')
    assert.equal(
        await page.getByLabel('API URL').inputValue(),
        'https://4100.api.green-api.com',
        'Адрес API должен быть заполнен по умолчанию',
    )
    await page.getByRole('button', { name: 'Подключиться' }).click()
    await page.getByRole('alert').filter({ hasText: '401' }).waitFor()
    api.badToken = false
    await page.getByRole('button', { name: 'Подключиться' }).click()
    await page.getByRole('button', { name: 'Выйти' }).waitFor()
    await page.getByRole('button', { name: 'Повторить загрузку чатов' }).click()
    await page
        .getByRole('button', { name: /Существующий диалог.*Старый исходящий текст/ })
        .waitFor()
    assert.equal(
        await page.getByRole('article').count(),
        0,
        'Превью должно появляться до открытия чата',
    )
    await page.getByRole('button', { name: /Существующий диалог/ }).click()
    await page.getByRole('article').filter({ hasText: 'Сообщение до входа' }).waitFor()
    assert.deepEqual(await page.getByRole('article').locator('p').allTextContents(), [
        'Сообщение до входа',
        'Старый исходящий текст',
    ])
    assert.match(
        await page.getByRole('article').filter({ hasText: 'Старый исходящий текст' }).textContent(),
        /Прочитано/,
    )
    assert.equal(await page.getByRole('button', { name: /Группа вне задачи/ }).count(), 0)
    assert.equal(await page.getByRole('button', { name: /Группа без типа/ }).count(), 0)
}

export async function checkChatCreationAndSending(page, api, origin) {
    await connectInstance(page, origin)
    await page.getByRole('button', { name: 'Новый чат', exact: true }).click()
    api.missingAccount = true
    await page.getByLabel('Новый чат по телефону').fill('+7 (999) 123-45-67')
    await page.getByRole('button', { name: 'Открыть', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'приватности' }).waitFor()
    api.missingAccount = false
    await page.getByRole('button', { name: 'Открыть', exact: true }).click()
    await page
        .getByRole('region', { name: 'Переписка' })
        .locator('header strong')
        .filter({ hasText: '+79991234567' })
        .waitFor()
    const composer = page.getByRole('textbox', { name: 'Текст сообщения' })
    await composer.waitFor()
    assert.equal(await composer.getAttribute('maxlength'), '4096')
    await composer.fill('Привет из браузера')
    api.failSend = true
    await page.getByRole('button', { name: 'Отправить', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: '500' }).waitFor()
    assert.equal(await composer.inputValue(), 'Привет из браузера')
    api.failSend = false
    await composer.press('Enter')
    await page.getByRole('article').filter({ hasText: 'Привет из браузера' }).waitFor()
    assert.deepEqual(api.sent, { chatId: '12345', message: 'Привет из браузера' })
    assert.equal(await composer.inputValue(), '')
}
