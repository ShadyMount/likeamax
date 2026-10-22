import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'

// Vite загружает reducer с теми же публичными импортами слайсов, что использует приложение.
// HTTP-сервер и браузер для этих проверок не запускаются.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
after(() => vite.close())
const { chatReducer, initialChatState } = await vite.ssrLoadModule(
    '/src/features/messaging/model/chatReducer.ts',
)

const message = { id: '10', text: 'Сообщение', outgoing: true, timestamp: 100, status: 'sent' }
const chatId = '12345'
const addMessage = { type: 'message-added', chatId, title: 'Контакт', message }
const readStatus = { type: 'status-received', chatId, idMessage: '10', status: 'read' }

function createChat() {
    return chatReducer(initialChatState, { type: 'chat-created', chatId, phone: '79991234567' })
}

test('Reducer: статус до сообщения сохраняется после его появления и запоздалого статуса', () => {
    let state = chatReducer(initialChatState, readStatus)
    state = chatReducer(state, addMessage)
    state = chatReducer(state, { ...readStatus, status: 'delivered' })
    assert.equal(state.chats[0].messages[0].status, 'read')
})

test('Reducer: история учитывает статус, полученный во время загрузки', () => {
    let state = createChat()
    state = chatReducer(state, { type: 'history-loading', chatId })
    state = chatReducer(state, readStatus)
    state = chatReducer(state, { type: 'history-loaded', chatId, messages: [message] })
    assert.equal(state.chats[0].messages[0].status, 'read')
    assert.equal(state.chats[0].previewLoading, false)
    assert.equal(state.chats[0].previewError, false)
})

test('Reducer: запоздалая история не стирает новое сообщение и не создаёт дубль', () => {
    let state = chatReducer(createChat(), addMessage)
    state = chatReducer(state, {
        ...addMessage,
        message: { ...message, id: '20', text: 'Новое', timestamp: 200 },
    })
    state = chatReducer(state, { type: 'history-loaded', chatId, messages: [message] })
    assert.deepEqual(
        state.chats[0].messages.map((item) => item.text),
        ['Сообщение', 'Новое'],
    )
})

test('Reducer: перезагрузка списка сохраняет чат, полученный через уведомление', () => {
    const state = chatReducer(initialChatState, addMessage)
    const result = chatReducer(state, {
        type: 'chats-loaded',
        chats: [{ chatId: 'other', name: 'Другой контакт' }],
    })
    assert.equal(result.chats.length, 2)
    assert.deepEqual(result.chats.find((chat) => chat.id === chatId).messages, [message])
})

test('Reducer: одинаковые ID в разных чатах не смешивают статусы', () => {
    let state = chatReducer(initialChatState, addMessage)
    state = chatReducer(state, { ...addMessage, chatId: 'other' })
    state = chatReducer(state, readStatus)
    assert.equal(state.chats.find((chat) => chat.id === chatId).messages[0].status, 'read')
    assert.equal(state.chats.find((chat) => chat.id === 'other').messages[0].status, 'sent')
})

test('Reducer: изменение статуса не меняет предыдущий снимок состояния', () => {
    const previous = chatReducer(initialChatState, addMessage)
    const next = chatReducer(previous, readStatus)
    assert.equal(previous.chats[0].messages[0].status, 'sent')
    assert.equal(next.chats[0].messages[0].status, 'read')
    assert.deepEqual(initialChatState, { chats: [], statuses: {} })
})
