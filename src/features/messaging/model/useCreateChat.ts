import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type { Api } from '../../../shared/api'
import { errorMessage } from '../../../shared/api'
import type { Chat } from '../../../entities/chat'
import type { ChatDispatch } from './chatReducer'

type Options = {
    api: Api
    chats: Chat[]
    dispatch: ChatDispatch
    onOpen: (chatId: string) => void
    loadContact: (chatId: string) => Promise<void>
}

export function useCreateChat({ api, chats, dispatch, onOpen, loadContact }: Options) {
    const [phone, setPhone] = useState('')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (creating) return
        const normalized = phone.replace(/[\s()+-]/g, '')
        if (!/^[1-9]\d{6,14}$/.test(normalized)) {
            setError('Введите номер в международном формате, например +7 999 123-45-67.')
            return
        }
        const existing = chats.find((chat) => chat.phone === normalized)
        if (existing) {
            onOpen(existing.id)
            setPhone('')
            setError('')
            return
        }
        setCreating(true)
        setError('')
        try {
            const result = await api.request('checkAccount', {
                phoneNumber: Number(normalized),
            })
            if (api.signal.aborted) return
            if (!result.exist || !result.chatId)
                throw new Error(
                    'Аккаунт не найден или номер скрыт настройками приватности Telegram.',
                )
            dispatch({ type: 'chat-created', chatId: result.chatId, phone: normalized })
            onOpen(result.chatId)
            setPhone('')
            // Чат уже доступен по номеру; имя уточняется независимо от успешного открытия.
            void loadContact(result.chatId).catch(() => {})
        } catch (error) {
            if (!api.signal.aborted) setError(errorMessage(error))
        } finally {
            if (!api.signal.aborted) setCreating(false)
        }
    }
    return { phone, setPhone, creating, error, submit }
}
