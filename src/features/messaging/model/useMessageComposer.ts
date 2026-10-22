import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type { Api } from '../../../shared/api'
import { errorMessage } from '../../../shared/api'
import type { Chat } from '../../../entities/chat'
import type { ChatDispatch } from './chatReducer'

export function useMessageComposer(
    api: Api,
    active: Chat | undefined,
    dispatch: ChatDispatch,
    loadHistory: (chatId: string) => Promise<void>,
) {
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const activeId = active?.id ?? ''
    const draft = drafts[activeId] ?? ''

    async function send(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!active || !draft.trim() || sending) return
        if (draft.length > 4096) {
            setError('Максимальная длина сообщения — 4096 символов.')
            return
        }
        // Получатель и текст фиксируются до запроса: пользователь может открыть другой чат во время отправки.
        const chatId = active.id
        const text = draft
        const timestamp = Date.now() / 1000
        setSending(true)
        setError('')
        try {
            const result = await api.request('sendMessage', {
                chatId,
                message: text,
            })
            if (api.signal.aborted) return
            dispatch({
                type: 'message-added',
                chatId,
                title: active.title,
                message: {
                    id: result.idMessage,
                    text,
                    outgoing: true,
                    timestamp,
                    estimatedTime: true,
                    status: 'queued',
                },
            })
            setDrafts((previous) => ({ ...previous, [chatId]: '' }))
            // Отправка уже подтверждена; сбой фонового обновления истории не отменяет сообщение.
            void loadHistory(chatId).catch(() => {})
        } catch (error) {
            if (!api.signal.aborted) setError(errorMessage(error))
        } finally {
            if (!api.signal.aborted) setSending(false)
        }
    }
    return {
        draft,
        setDraft: (text: string) => setDrafts((previous) => ({ ...previous, [activeId]: text })),
        sending,
        send,
        error,
        setError,
    }
}
