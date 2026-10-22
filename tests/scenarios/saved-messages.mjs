import assert from 'node:assert/strict'
import { connectInstance } from '../helpers/session.mjs'

export async function checkSavedMessages(page, api, origin) {
    // В моке getChats нет собственного чата: он должен появиться даже с пустой историей.
    await connectInstance(page, origin)
    await page.getByRole('button', { name: /Избранное/ }).click()
    await page.getByText('Сообщения для себя', { exact: true }).waitFor()
    await page.getByText('Текстовых сообщений пока нет', { exact: true }).waitFor()
    const composer = page.getByRole('textbox', { name: 'Текст сообщения' })
    await composer.fill('Заметка себе')
    await composer.press('Enter')
    await page.getByRole('article').filter({ hasText: 'Заметка себе' }).waitFor()
    assert.deepEqual(api.sent, { chatId: 'self', message: 'Заметка себе' })
    const idMessage = `outgoing-${api.sendId}`
    const timestamp = 2000000000
    api.selfHistory = [
        {
            idMessage,
            timestamp,
            type: 'incoming',
            typeMessage: 'textMessage',
            textMessage: 'Заметка себе',
        },
    ]
    // Особенность API: собственный текст может прийти как входящий, затем как исходящий.
    for (const typeWebhook of ['incomingMessageReceived', 'outgoingAPIMessageReceived']) {
        await api.deliver({
            typeWebhook,
            idMessage,
            timestamp,
            senderData: { chatId: 'self', chatType: 'user', senderName: 'Имя владельца' },
            messageData: {
                typeMessage: 'textMessage',
                textMessageData: { textMessage: 'Заметка себе' },
            },
        })
    }
    assert.equal(await page.getByRole('article').count(), 1)
    assert.equal(await page.getByRole('article').getAttribute('data-direction'), 'outgoing')
    assert.equal(
        await page.getByRole('article').getByLabel('В очереди', { exact: true }).count(),
        0,
    )
    await page.getByRole('button', { name: /Второй диалог/ }).click()
    await page.getByRole('button', { name: /Избранное.*Заметка себе/ }).click()
    await page.getByText('Загрузка сообщений…', { exact: true }).waitFor({ state: 'hidden' })
    assert.equal(await page.getByRole('article').count(), 1)
    assert.equal(await page.getByRole('article').getAttribute('data-direction'), 'outgoing')
}
