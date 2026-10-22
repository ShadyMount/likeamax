import type { ContactInfo } from '../../../shared/api'
import type { Chat, Message } from './types'

export function contactName(contact: ContactInfo, chatId: string) {
    return [contact.contactName, contact.name, contact.username]
        .find((name) => name?.trim() && name.trim() !== chatId && !/^\+?\d+$/.test(name.trim()))
        ?.trim()
}

export const statusLabels: Record<string, string> = {
    queued: 'В очереди',
    sent: 'Отправлено',
    delivered: 'Доставлено',
    read: 'Прочитано',
    failed: 'Не отправлено',
    noAccount: 'Аккаунт недоступен',
}

const statusOrder: Record<string, number> = {
    queued: 0,
    sent: 1,
    delivered: 2,
    read: 3,
    failed: 4,
    noAccount: 4,
}

export function latestStatus(first?: string, second?: string) {
    return (statusOrder[first ?? ''] ?? -1) > (statusOrder[second ?? ''] ?? -1) ? first : second
}

export function compareMessages(a: Message, b: Message) {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
    if (/^\d+$/.test(a.id) && /^\d+$/.test(b.id)) {
        // При совпадении секунды порядок задаётся ID. BigInt исключает округление больших чисел.
        const first = BigInt(a.id)
        const second = BigInt(b.id)
        return first < second ? -1 : first > second ? 1 : 0
    }
    return a.id.localeCompare(b.id)
}

export function mergeMessages(first: Message[], second: Message[]) {
    const messages = new Map<string, Message>()
    for (const message of [...first, ...second]) {
        const key = `${message.outgoing}:${message.id}`
        const previous = messages.get(key)
        // Ответ SendMessage может прийти после уведомления с точным временем.
        // В таком случае временная отметка браузера не должна перезаписать серверную.
        const authoritative =
            previous && message.estimatedTime && !previous.estimatedTime ? previous : message
        messages.set(key, {
            ...authoritative,
            status: latestStatus(previous?.status, message.status),
        })
    }
    return [...messages.values()].sort(compareMessages)
}

export function addMessage(chats: Chat[], chatId: string, title: string, message: Message) {
    if (!chats.some((chat) => chat.id === chatId))
        return [...chats, { id: chatId, title, messages: [message] }]
    return chats.map((chat) =>
        chat.id === chatId ? { ...chat, messages: mergeMessages(chat.messages, [message]) } : chat,
    )
}
