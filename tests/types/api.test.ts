import type { Api, HistoryMessage, Notification } from '../../src/shared/api'

// Проверяется компилятором, без запуска запросов. Если ошибочный вызов станет допустимым,
// TypeScript сообщит о неиспользуемом @ts-expect-error и проверка завершится ошибкой.
export async function checkApiContract(api: Api) {
    const history: HistoryMessage[] = await api.request('getChatHistory', {
        chatId: '12345',
        count: 100,
    })
    const notification: Notification | null = await api.request('receiveNotification')
    const sent = await api.request('sendMessage', { chatId: '12345', message: 'Привет' })
    const id: string = sent.idMessage
    const deleted = await api.request('deleteNotification', 100)
    const confirmed: boolean = deleted.result

    // @ts-expect-error Неизвестное имя метода.
    await api.request('sendMesage', { chatId: '12345', message: 'Привет' })
    // @ts-expect-error Тело запроса обязательно.
    await api.request('sendMessage')
    // @ts-expect-error Текст сообщения обязателен.
    await api.request('sendMessage', { chatId: '12345' })
    // @ts-expect-error chatId должен быть строкой.
    await api.request('sendMessage', { chatId: 12345, message: 'Привет' })
    // @ts-expect-error Номер телефона передаётся числом.
    await api.request('checkAccount', { phoneNumber: '79991234567' })
    // @ts-expect-error У GET-метода нет тела запроса.
    await api.request('getChats', { chatId: '12345' })
    // @ts-expect-error Для истории нужен лимит сообщений.
    await api.request('getChatHistory', { chatId: '12345' })
    // @ts-expect-error Идентификатор подтверждаемого уведомления обязателен.
    await api.request('deleteNotification')
    // @ts-expect-error DELETE принимает идентификатор, а не тело запроса.
    await api.request('deleteNotification', { receiptId: 100 })
    // @ts-expect-error Ответ sendMessage не содержит списка чатов.
    const chats = sent.chats

    return { history, notification, id, confirmed, chats }
}
