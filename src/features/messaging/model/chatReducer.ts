import type { Dispatch } from 'react'
import type { ContactInfo, RemoteChat } from '../../../shared/api'
import type { Chat, Message } from '../../../entities/chat'
import { addMessage, contactName, latestStatus, mergeMessages } from '../../../entities/chat'

type ChatState = {
    selfChatId: string
    chats: Chat[]
    // Статус может прийти раньше самого сообщения или ответа SendMessage.
    statuses: Record<string, string>
}

export type ChatAction =
    | { type: 'chats-loaded'; chats: RemoteChat[] }
    | { type: 'contact-loaded'; chatId: string; contact: ContactInfo }
    | { type: 'history-loading' | 'history-failed'; chatId: string }
    | { type: 'history-loaded'; chatId: string; messages: Message[] }
    | { type: 'chat-created'; chatId: string; phone: string }
    | { type: 'message-added'; chatId: string; title: string; message: Message }
    | { type: 'status-received'; chatId: string; idMessage: string; status: string }

export type ChatDispatch = Dispatch<ChatAction>
export const initialChatState: ChatState = { selfChatId: '', chats: [], statuses: {} }

function updateChat(state: ChatState, chatId: string, update: (chat: Chat) => Chat): ChatState {
    return {
        ...state,
        chats: state.chats.map((chat) => (chat.id === chatId ? update(chat) : chat)),
    }
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
        case 'chats-loaded': {
            // Обновление списка не должно стирать сообщения, уже полученные из очереди.
            const chats = new Map(state.chats.map((chat) => [chat.id, chat]))
            for (const remote of action.chats) {
                const existing = chats.get(remote.chatId)
                chats.set(remote.chatId, {
                    ...existing,
                    id: remote.chatId,
                    isSaved: remote.chatId === state.selfChatId,
                    title:
                        remote.chatId === state.selfChatId
                            ? 'Избранное'
                            : contactName(remote, remote.chatId) ||
                              existing?.title ||
                              (remote.phoneNumber ? `+${remote.phoneNumber}` : 'Контакт без имени'),
                    phone: remote.phoneNumber ? String(remote.phoneNumber) : existing?.phone,
                    messages: existing?.messages ?? [],
                    previewLoading: true,
                })
            }
            return { ...state, chats: [...chats.values()] }
        }
        case 'contact-loaded':
            return updateChat(state, action.chatId, (chat) => ({
                ...chat,
                title: chat.isSaved
                    ? 'Избранное'
                    : contactName(action.contact, action.chatId) || chat.title,
                phone: action.contact.phoneNumber ? String(action.contact.phoneNumber) : chat.phone,
            }))
        case 'history-loading':
        case 'history-failed':
            return updateChat(state, action.chatId, (chat) => ({
                ...chat,
                previewLoading: action.type === 'history-loading',
                previewError: action.type === 'history-failed',
            }))
        case 'history-loaded': {
            // Статус мог прийти, пока запрос истории ещё выполнялся.
            const isSaved = action.chatId === state.selfChatId
            const messages = action.messages.map((message) => ({
                ...message,
                outgoing: isSaved || message.outgoing,
                status: isSaved
                    ? undefined
                    : latestStatus(
                          message.status,
                          state.statuses[`${action.chatId}:${message.id}`],
                      ),
            }))
            return updateChat(state, action.chatId, (chat) => ({
                ...chat,
                // Пока загружалась история, в чате могли появиться более новые сообщения.
                messages: mergeMessages(messages, chat.messages),
                previewLoading: false,
                previewError: false,
            }))
        }
        case 'chat-created': {
            if (state.chats.some((chat) => chat.id === action.chatId)) {
                return updateChat(state, action.chatId, (chat) => ({
                    ...chat,
                    phone: action.phone,
                }))
            }
            return {
                ...state,
                chats: [
                    ...state.chats,
                    {
                        id: action.chatId,
                        title:
                            action.chatId === state.selfChatId ? 'Избранное' : `+${action.phone}`,
                        isSaved: action.chatId === state.selfChatId,
                        phone: action.phone,
                        messages: [],
                    },
                ],
            }
        }
        case 'message-added': {
            const isSaved = action.chatId === state.selfChatId
            // GREEN-API может прислать собственное сообщение как входящее. Направление
            // нормализуется до дедупликации, чтобы уведомление и ответ sendMessage слились.
            const message = {
                ...action.message,
                outgoing: isSaved || action.message.outgoing,
                status: isSaved
                    ? undefined
                    : action.message.outgoing
                      ? latestStatus(
                            action.message.status,
                            state.statuses[`${action.chatId}:${action.message.id}`],
                        )
                      : action.message.status,
            }
            const next = {
                ...state,
                chats: addMessage(
                    state.chats,
                    action.chatId,
                    isSaved ? 'Избранное' : action.title,
                    message,
                ),
            }
            return isSaved
                ? updateChat(next, action.chatId, (chat) => ({
                      ...chat,
                      title: 'Избранное',
                      isSaved: true,
                  }))
                : next
        }
        case 'status-received': {
            // У сохранённого сообщения нет отдельного получателя и статуса прочтения.
            if (action.chatId === state.selfChatId) return state
            const key = `${action.chatId}:${action.idMessage}`
            const status = latestStatus(state.statuses[key], action.status) ?? action.status
            const next = { ...state, statuses: { ...state.statuses, [key]: status } }
            return updateChat(next, action.chatId, (chat) => ({
                ...chat,
                messages: chat.messages.map((message) =>
                    message.outgoing && message.id === action.idMessage
                        ? { ...message, status: latestStatus(message.status, status) }
                        : message,
                ),
            }))
        }
    }
}
