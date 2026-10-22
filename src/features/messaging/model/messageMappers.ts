import type { HistoryMessage, Notification } from '../../../shared/api'
import type { Message } from '../../../entities/chat'
import type { ChatAction } from './chatReducer'

type NotificationEvent =
    | Extract<ChatAction, { type: 'message-added' | 'status-received' }>
    | { type: 'delivery-error'; error: string }

export function mapHistoryMessages(items: HistoryMessage[]): Message[] {
    return items.flatMap((item): Message[] => {
        // История содержит медиа и удалённые сообщения; интерфейс работает только с текстом.
        if (
            item.isDeleted ||
            typeof item.textMessage !== 'string' ||
            (item.typeMessage !== 'textMessage' && item.typeMessage !== 'extendedTextMessage')
        ) {
            return []
        }
        return [
            {
                id: item.idMessage,
                text: item.textMessage,
                outgoing: item.type === 'outgoing',
                timestamp: item.timestamp,
                status: item.statusMessage,
            },
        ]
    })
}

// Формат текста в истории и уведомлениях различается. Приводим оба к одной модели Message.
export function mapNotification(body: Notification['body']): NotificationEvent | null {
    const sender = body.senderData
    const data = body.messageData
    const text =
        data?.typeMessage === 'textMessage'
            ? data.textMessageData?.textMessage
            : data?.typeMessage === 'extendedTextMessage'
              ? data.extendedTextMessageData?.text
              : undefined
    const outgoing =
        body.typeWebhook === 'outgoingMessageReceived' ||
        body.typeWebhook === 'outgoingAPIMessageReceived'

    if (
        (body.typeWebhook === 'incomingMessageReceived' || outgoing) &&
        sender &&
        text !== undefined &&
        (sender.chatType === undefined ||
            sender.chatType === 'user' ||
            sender.chatType === 'bot') &&
        !sender.chatId.startsWith('-')
    ) {
        return {
            type: 'message-added',
            chatId: sender.chatId,
            title: sender.chatName || sender.senderName || 'Контакт без имени',
            message: {
                id: body.idMessage,
                text,
                outgoing,
                timestamp: body.timestamp,
                status: outgoing ? 'sent' : undefined,
            },
        }
    }
    if (body.typeWebhook === 'outgoingMessageStatus' && body.chatId && body.status) {
        if (body.idMessage) {
            return {
                type: 'status-received',
                chatId: body.chatId,
                idMessage: body.idMessage,
                status: body.status,
            }
        }
        if (body.status === 'failed' || body.status === 'noAccount') {
            return {
                type: 'delivery-error',
                error: 'Telegram не доставил сообщение: получатель недоступен или отправка отклонена.',
            }
        }
    }
    return null
}
