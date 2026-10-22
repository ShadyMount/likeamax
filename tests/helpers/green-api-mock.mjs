import assert from 'node:assert/strict'

// Управление ответами доступно сценариям; счётчики позволяют проверить повторы и отмену запросов.
export async function mockGreenApi(page) {
    const api = {
        badToken: false,
        invalidJson: false,
        missingAccount: false,
        failSend: false,
        failDelete: false,
        failChats: false,
        failHistory: false,
        checks: 0,
        sendId: 0,
        receives: 0,
        deletes: 0,
        sent: null,
        echoBeforeResponse: false,
        queue: [],
        selfHistory: [],
    }
    await page.route('https://4100.api.green-api.com/**', async (route) => {
        const request = route.request()
        const method = new URL(request.url()).pathname.split('/')[2]
        if (api.invalidJson && method === 'getStateInstance') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: 'test-token: invalid JSON',
            })
            return
        }
        let json = null
        let status = 200
        if (method === 'getStateInstance') {
            json = { stateInstance: 'authorized' }
            if (api.badToken) status = 401
        } else if (method === 'getAccountSettings') json = { chatId: 'self' }
        else if (method === 'getSettings') json = { incomingWebhook: 'yes', webhookUrl: '' }
        else if (method === 'getChats') {
            if (api.failChats) {
                status = 500
                api.failChats = false
            }
            json = [
                { chatId: 'existing-1', name: '', username: '@profile', phoneNumber: 0 },
                { chatId: 'existing-2', name: 'Второй диалог', type: 'user', phoneNumber: 0 },
                { chatId: 'existing-bot', name: 'Тестовый бот', type: 'bot', phoneNumber: 0 },
                { chatId: '-123', name: 'Группа вне задачи', type: 'group', phoneNumber: 0 },
                { chatId: '-456', name: 'Группа без типа', phoneNumber: 0 },
            ]
        } else if (method === 'getContactInfo') {
            json =
                request.postDataJSON().chatId === 'existing-1'
                    ? {
                          name: 'Имя из Telegram',
                          contactName: 'Существующий диалог',
                          chatId: 'existing-1',
                      }
                    : {}
        } else if (method === 'getChatHistory') {
            const { chatId, count } = request.postDataJSON()
            assert.equal(count, 100)
            if (api.failHistory && chatId === 'existing-2') {
                status = 500
                api.failHistory = false
            }
            json =
                chatId === 'existing-1'
                    ? [
                          {
                              idMessage: '1792500000900',
                              type: 'outgoing',
                              typeMessage: 'textMessage',
                              textMessage: 'Старый исходящий текст',
                              statusMessage: 'read',
                              timestamp: 1792500000,
                          },
                          {
                              idMessage: '1792500000100',
                              type: 'incoming',
                              typeMessage: 'textMessage',
                              textMessage: 'Сообщение до входа',
                              timestamp: 1792500000,
                          },
                          {
                              idMessage: 'media',
                              type: 'incoming',
                              typeMessage: 'imageMessage',
                              caption: 'Вложение вне задачи',
                              timestamp: 1792500002,
                          },
                          {
                              idMessage: 'deleted',
                              type: 'incoming',
                              typeMessage: 'textMessage',
                              textMessage: 'Удалённый текст',
                              isDeleted: true,
                              timestamp: 1792500003,
                          },
                      ]
                    : chatId === 'self'
                      ? api.selfHistory
                      : []
        } else if (method === 'checkAccount') {
            api.checks++
            assert.deepEqual(request.postDataJSON(), { phoneNumber: 79991234567 })
            json = api.missingAccount
                ? { exist: false, chatId: '' }
                : { exist: true, chatId: '12345' }
        } else if (method === 'sendMessage') {
            api.sent = request.postDataJSON()
            json = {
                idMessage: api.echoBeforeResponse ? '2000000000500' : `outgoing-${++api.sendId}`,
            }
            if (api.failSend) status = 500
            // Воспроизводим гонку: событие с серверным временем обрабатывается раньше ответа отправки.
            if (api.echoBeforeResponse) {
                api.queue.push({
                    receiptId: 999,
                    body: {
                        typeWebhook: 'outgoingAPIMessageReceived',
                        idMessage: json.idMessage,
                        timestamp: 2000000000,
                        senderData: { chatId: api.sent.chatId, chatType: 'user' },
                        messageData: {
                            typeMessage: 'textMessage',
                            textMessageData: { textMessage: api.sent.message },
                        },
                    },
                })
                for (
                    let attempt = 0;
                    attempt < 100 && api.queue.some((item) => item.receiptId === 999);
                    attempt++
                ) {
                    await new Promise((resolve) => setTimeout(resolve, 50))
                }
                assert.equal(
                    api.queue.some((item) => item.receiptId === 999),
                    false,
                    'Серверное уведомление должно прийти до ответа SendMessage',
                )
            }
        } else if (method === 'receiveNotification') {
            api.receives++
            if (!api.queue.length) await new Promise((resolve) => setTimeout(resolve, 300))
            json = api.queue[0] ?? null
        } else if (method === 'deleteNotification') {
            assert.equal(request.method(), 'DELETE')
            api.deletes++
            if (api.failDelete) {
                status = 500
                api.failDelete = false
            } else {
                api.queue.shift()
                json = { result: true }
            }
        } else throw new Error(`Неожиданный метод API: ${method}`)
        await route.fulfill({ status, json })
    })

    let receipt = 100
    // Ждём подтверждения конкретного события, а не задержку произвольной длительности.
    async function deliver(body) {
        const receiptId = ++receipt
        const acknowledged = page.waitForResponse(
            (response) =>
                response.url().endsWith(`/deleteNotification/test-token/${receiptId}`) &&
                response.status() === 200,
        )
        api.queue.push({ receiptId, body })
        await acknowledged
    }
    api.deliver = deliver
    return api
}
