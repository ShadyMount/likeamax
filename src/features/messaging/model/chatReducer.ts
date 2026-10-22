import type { Dispatch } from 'react'
import type { ContactInfo, RemoteChat } from '../../../shared/api'
import type { Chat, Message } from '../../../entities/chat'
import { addMessage, contactName, latestStatus, mergeMessages } from '../../../entities/chat'

type ChatState = {
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
export const initialChatState: ChatState = { chats: [], statuses: {} }

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
                    title:
                        contactName(remote, remote.chatId) ||
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
                title: contactName(action.contact, action.chatId) || chat.title,
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
            const messages = action.messages.map((message) => ({
                ...message,
                status: latestStatus(
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
                        title: `+${action.phone}`,
                        phone: action.phone,
                        messages: [],
                    },
                ],
            }
        }
        case 'message-added': {
            const message = action.message.outgoing
                ? {
                      ...action.message,
                      status: latestStatus(
                          action.message.status,
                          state.statuses[`${action.chatId}:${action.message.id}`],
                      ),
                  }
                : action.message
            return {
                ...state,
                chats: addMessage(state.chats, action.chatId, action.title, message),
            }
        }
        case 'status-received': {
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
