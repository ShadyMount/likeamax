import assert from 'node:assert/strict'
import { connectInstance } from '../helpers/session.mjs'

export async function checkBotMessages(page, api, origin) {
    await connectInstance(page, origin)
    const { deliver } = api
    await page.getByRole('button', { name: /Тестовый бот/ }).click()
    const botSender = {
        chatId: 'existing-bot',
        chatType: 'bot',
        chatName: 'Тестовый бот',
        senderType: 'bot',
    }
    const botMessage = {
        typeWebhook: 'incomingMessageReceived',
        idMessage: '2000000003000',
        timestamp: 2000000003,
        senderData: botSender,
        messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'Сообщение от бота без переоткрытия' },
        },
    }
    await deliver(botMessage)
    await page
        .getByRole('article')
        .filter({ hasText: 'Сообщение от бота без переоткрытия' })
        .waitFor()
    assert.match(
        await page.getByRole('button', { name: /Тестовый бот/ }).textContent(),
        /Сообщение от бота без переоткрытия/,
    )
    assert.equal(
        await page
            .getByRole('navigation', { name: 'Диалоги' })
            .getByRole('button')
            .locator('strong')
            .first()
            .textContent(),
        'Тестовый бот',
    )
    await deliver(botMessage)
    assert.equal(
        await page
            .getByRole('article')
            .filter({ hasText: 'Сообщение от бота без переоткрытия' })
            .count(),
        1,
    )
    await page.getByRole('button', { name: /Второй диалог/ }).click()
    await deliver({
        typeWebhook: 'incomingMessageReceived',
        idMessage: '2000000004000',
        timestamp: 2000000004,
        senderData: botSender,
        messageData: {
            typeMessage: 'extendedTextMessage',
            extendedTextMessageData: { text: 'Бот прислал https://example.com/' },
        },
    })
    await page.getByRole('button', { name: /Тестовый бот.*Бот прислал/ }).waitFor()
    assert.equal(await page.getByRole('article').filter({ hasText: 'Бот прислал' }).count(), 0)
    await page.getByRole('button', { name: /Тестовый бот/ }).click()
    await page.getByRole('article').filter({ hasText: 'Бот прислал' }).waitFor()
    await deliver({
        typeWebhook: 'incomingMessageReceived',
        idMessage: 'group-event',
        timestamp: 2000000005,
        senderData: { chatId: '-123', chatType: 'group', chatName: 'Группа вне задачи' },
        messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'Групповой текст вне задачи' },
        },
    })
    assert.equal(await page.getByRole('button', { name: /Группа вне задачи/ }).count(), 0)
}
