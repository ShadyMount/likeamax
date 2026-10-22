import assert from 'node:assert/strict'
import { connectInstance } from '../helpers/session.mjs'

export async function checkMessageOrder(page, api, origin) {
    await connectInstance(page, origin)
    const { deliver } = api
    const composer = page.getByRole('textbox', { name: 'Текст сообщения' })
    await page.getByRole('button', { name: /Второй диалог/ }).click()
    const secondSender = { chatId: 'existing-2', chatType: 'user', senderName: 'Второй диалог' }
    await deliver({
        typeWebhook: 'incomingMessageReceived',
        idMessage: '1999999999000',
        timestamp: 1999999999,
        senderData: secondSender,
        messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'До отправки' },
        },
    })
    api.echoBeforeResponse = true
    await composer.fill('Серверное время отправки')
    await composer.press('Enter')
    await page.getByRole('button', { name: 'Отправить', exact: true }).waitFor()
    await page.getByRole('article').filter({ hasText: 'Серверное время отправки' }).waitFor()
    await page.waitForFunction(() => document.querySelector('textarea')?.value === '')
    assert.deepEqual(
        await page.getByRole('article').locator('p').allTextContents(),
        ['До отправки', 'Серверное время отправки'],
        'Локальное время не должно заменять время серверного уведомления',
    )
    api.echoBeforeResponse = false
    await deliver({
        typeWebhook: 'incomingMessageReceived',
        idMessage: '90071992547409931',
        timestamp: 2000000002,
        senderData: secondSender,
        messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'Вторая в ту же секунду' },
        },
    })
    await deliver({
        typeWebhook: 'incomingMessageReceived',
        idMessage: '90071992547409930',
        timestamp: 2000000002,
        senderData: secondSender,
        messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'Первая в ту же секунду' },
        },
    })
    await deliver({
        typeWebhook: 'incomingMessageReceived',
        idMessage: 'old-delayed',
        timestamp: 1999999990,
        senderData: secondSender,
        messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'Запоздавшее старое сообщение' },
        },
    })
    assert.deepEqual(await page.getByRole('article').locator('p').allTextContents(), [
        'Запоздавшее старое сообщение',
        'До отправки',
        'Серверное время отправки',
        'Первая в ту же секунду',
        'Вторая в ту же секунду',
    ])
    assert.match(
        await page.getByRole('button', { name: /Второй диалог/ }).textContent(),
        /Вторая в ту же секунду/,
    )
    assert.equal(
        await page
            .getByRole('navigation', { name: 'Диалоги' })
            .getByRole('button')
            .locator('strong')
            .first()
            .textContent(),
        'Второй диалог',
        'Последнее сообщение должно поднимать чат в списке',
    )
}
