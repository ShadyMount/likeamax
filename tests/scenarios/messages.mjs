import assert from 'node:assert/strict'
import { connectInstance, openPhoneChat } from '../helpers/session.mjs'

export async function checkNotificationsAndStatuses(page, api, origin) {
    await connectInstance(page, origin)
    await openPhoneChat(page)
    const composer = page.getByRole('textbox', { name: 'Текст сообщения' })
    await composer.fill('Привет из браузера')
    await composer.press('Enter')
    await page.getByRole('article').filter({ hasText: 'Привет из браузера' }).waitFor()
    const successfulSendId = `outgoing-${api.sendId}`
    api.failDelete = true
    const { deliver } = api
    const notification = {
        receiptId: 100,
        body: {
            typeWebhook: 'incomingMessageReceived',
            idMessage: 'incoming-1',
            timestamp: 1792600000,
            senderData: { chatId: '12345', chatType: 'user', senderName: 'Получатель' },
            messageData: {
                typeMessage: 'textMessage',
                textMessageData: { textMessage: 'Ответ из Telegram' },
            },
        },
    }
    api.queue.push(notification)
    await page.getByRole('article').filter({ hasText: 'Ответ из Telegram' }).waitFor()
    await page.getByRole('alert').filter({ hasText: 'Повтор через 5 секунд' }).waitFor()
    await page.getByRole('status').filter({ hasText: 'Подключено' }).waitFor({ timeout: 10000 })
    assert.equal(api.deletes, 2)
    assert.equal(
        await page.getByRole('article').filter({ hasText: 'Ответ из Telegram' }).count(),
        1,
    )

    const senderData = { chatId: '12345', chatType: 'user', senderName: 'Получатель' }
    await deliver({
        typeWebhook: 'outgoingAPIMessageReceived',
        idMessage: successfulSendId,
        timestamp: Date.now() / 1000,
        senderData,
        messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'Привет из браузера' },
        },
    })
    assert.equal(
        await page.getByRole('article').filter({ hasText: 'Привет из браузера' }).count(),
        1,
        'Уведомление API не должно дублировать отправленное сообщение',
    )
    await deliver({
        typeWebhook: 'outgoingMessageStatus',
        chatId: '12345',
        idMessage: successfulSendId,
        status: 'read',
    })
    await page
        .getByRole('article')
        .filter({ hasText: 'Привет из браузера' })
        .filter({ hasText: 'Прочитано' })
        .waitFor()
    await deliver({
        typeWebhook: 'outgoingMessageStatus',
        chatId: '12345',
        idMessage: successfulSendId,
        status: 'delivered',
    })
    assert.match(
        await page.getByRole('article').filter({ hasText: 'Привет из браузера' }).textContent(),
        /Прочитано/,
        'Запоздалый статус не должен отменять прочтение',
    )
    await deliver({
        typeWebhook: 'outgoingMessageReceived',
        idMessage: 'phone-1',
        timestamp: Date.now() / 1000,
        senderData,
        messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'Написано с телефона' },
        },
    })
    const phoneMessage = page.getByRole('article').filter({ hasText: 'Написано с телефона' })
    await phoneMessage.waitFor()
    assert.match(await phoneMessage.getAttribute('data-direction'), /outgoing/)
    // Статус должен сохраниться, даже если уведомление с текстом ещё не было получено.
    await deliver({
        typeWebhook: 'outgoingMessageStatus',
        chatId: '12345',
        idMessage: 'early-status',
        status: 'read',
    })
    await deliver({
        typeWebhook: 'outgoingMessageReceived',
        idMessage: 'early-status',
        timestamp: Date.now() / 1000,
        senderData,
        messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'Статус получен раньше текста' },
        },
    })
    await page
        .getByRole('article')
        .filter({ hasText: 'Статус получен раньше текста' })
        .filter({ hasText: 'Прочитано' })
        .waitFor()
    await deliver({
        typeWebhook: 'incomingMessageReceived',
        idMessage: 'link-1',
        timestamp: Date.now() / 1000,
        senderData,
        messageData: {
            typeMessage: 'extendedTextMessage',
            extendedTextMessageData: {
                text: 'Ссылка https://example.com/ <script>alert(1)</script>',
            },
        },
    })
    await page.getByRole('article').filter({ hasText: 'Ссылка https://example.com/' }).waitFor()
    await deliver({
        typeWebhook: 'incomingMessageReceived',
        idMessage: 'media-1',
        timestamp: Date.now() / 1000,
        senderData,
        messageData: {
            typeMessage: 'imageMessage',
            fileMessageData: { caption: 'Не показывать вложение' },
        },
    })
    assert.equal(
        await page.getByRole('article').filter({ hasText: 'Не показывать вложение' }).count(),
        0,
    )
}

export async function checkDraftsAndTextInput(page, api, origin) {
    await connectInstance(page, origin)
    await openPhoneChat(page)
    const checksBeforeReopen = api.checks
    const { deliver } = api
    const composer = page.getByRole('textbox', { name: 'Текст сообщения' })
    await composer.fill('Черновик первого чата')
    await page.getByRole('button', { name: /Второй диалог/ }).click()
    assert.equal(await composer.inputValue(), '')
    await composer.fill('Черновик второго чата')
    await page.getByRole('button', { name: /\+79991234567/ }).click()
    assert.equal(await composer.inputValue(), 'Черновик первого чата')
    await page.getByLabel('Новый чат по телефону').fill('+7 999 123-45-67')
    await page.getByRole('button', { name: 'Открыть', exact: true }).click()
    await page.getByLabel('Новый чат по телефону').fill('+7 999 123-45-67')
    await page.getByRole('button', { name: 'Открыть', exact: true }).click()
    assert.equal(
        api.checks,
        checksBeforeReopen,
        'Известный номер должен открывать чат без повторного запроса',
    )
    assert.equal(await page.getByRole('button', { name: /\+79991234567/ }).count(), 1)
    await composer.fill('   ')
    assert.equal(
        await page.getByRole('button', { name: 'Отправить', exact: true }).isDisabled(),
        true,
    )
    await composer.fill('Юникод 👋')
    await composer.press('Shift+Enter')
    await composer.press('End')
    await composer.press('Enter')
    await page.getByRole('article').filter({ hasText: 'Юникод 👋' }).waitFor()
    assert.equal(api.sent.message, 'Юникод 👋\n')
    await composer.fill('Я'.repeat(4096))
    await composer.press('Enter')
    await page
        .getByRole('article')
        .filter({ hasText: 'Я'.repeat(4096) })
        .waitFor()
    assert.equal(api.sent.message.length, 4096)
    await deliver({
        typeWebhook: 'outgoingMessageStatus',
        chatId: '12345',
        idMessage: `outgoing-${api.sendId}`,
        status: 'failed',
    })
    await page
        .getByRole('article')
        .filter({ hasText: 'Я'.repeat(4096) })
        .filter({ hasText: 'Не отправлено' })
        .waitFor()
}
