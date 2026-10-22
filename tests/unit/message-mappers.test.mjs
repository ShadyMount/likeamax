import assert from 'node:assert/strict'
import test from 'node:test'
import {
    mapHistoryMessages,
    mapNotification,
} from '../../src/features/messaging/model/messageMappers.ts'

test('История: сохраняются текст, направление, время и статус; медиа и удалённый текст исключаются', () => {
    const incoming = {
        idMessage: '1',
        type: 'incoming',
        typeMessage: 'textMessage',
        textMessage: 'Входящее',
        timestamp: 100,
    }
    const outgoing = {
        ...incoming,
        idMessage: '2',
        type: 'outgoing',
        typeMessage: 'extendedTextMessage',
        textMessage: 'Исходящее',
        statusMessage: 'read',
    }
    assert.deepEqual(
        mapHistoryMessages([
            incoming,
            outgoing,
            { ...incoming, idMessage: '3', typeMessage: 'imageMessage' },
            { ...incoming, idMessage: '4', isDeleted: true },
            { ...incoming, idMessage: '5', textMessage: undefined },
        ]),
        [
            { id: '1', text: 'Входящее', outgoing: false, timestamp: 100, status: undefined },
            { id: '2', text: 'Исходящее', outgoing: true, timestamp: 100, status: 'read' },
        ],
    )
})

const incomingNotification = {
    typeWebhook: 'incomingMessageReceived',
    idMessage: '1',
    timestamp: 100,
    senderData: { chatId: '12345', chatType: 'user', senderName: 'Контакт' },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
}

test('Уведомления: личный чат с ботом и расширенный текст преобразуются в сообщение', () => {
    const event = mapNotification({
        ...incomingNotification,
        senderData: { chatId: '12345', chatType: 'bot', chatName: 'Бот' },
        messageData: {
            typeMessage: 'extendedTextMessage',
            extendedTextMessageData: { text: 'Ссылка https://example.com/' },
        },
    })
    assert.deepEqual(event, {
        type: 'message-added',
        chatId: '12345',
        title: 'Бот',
        message: {
            id: '1',
            text: 'Ссылка https://example.com/',
            outgoing: false,
            timestamp: 100,
            status: undefined,
        },
    })
})

test('Уведомления: события исходящих с телефона и API сохраняют серверное время', () => {
    for (const typeWebhook of ['outgoingMessageReceived', 'outgoingAPIMessageReceived']) {
        const event = mapNotification({ ...incomingNotification, typeWebhook })
        assert.equal(event.message.outgoing, true)
        assert.equal(event.message.status, 'sent')
        assert.equal(event.message.timestamp, 100)
    }
})

test('Уведомления: группы, медиа и служебные события пропускаются', () => {
    for (const body of [
        { ...incomingNotification, senderData: { chatId: '-123', chatType: 'group' } },
        { ...incomingNotification, senderData: { chatId: '-123' } },
        { ...incomingNotification, messageData: { typeMessage: 'imageMessage' } },
        { ...incomingNotification, typeWebhook: 'stateInstanceChanged' },
    ]) {
        assert.equal(mapNotification(body), null)
    }
})

test('Уведомления: статус конкретного сообщения отделяется от общей ошибки доставки', () => {
    const status = {
        typeWebhook: 'outgoingMessageStatus',
        chatId: '12345',
        idMessage: '1',
        status: 'read',
    }
    assert.deepEqual(mapNotification(status), {
        type: 'status-received',
        chatId: '12345',
        idMessage: '1',
        status: 'read',
    })
    for (const failure of ['failed', 'noAccount']) {
        assert.deepEqual(mapNotification({ ...status, idMessage: '', status: failure }), {
            type: 'delivery-error',
            error: 'Telegram не доставил сообщение: получатель недоступен или отправка отклонена.',
        })
    }
    assert.equal(mapNotification({ ...status, idMessage: '' }), null)
})
