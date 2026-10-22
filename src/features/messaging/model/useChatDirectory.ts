import { useCallback, useEffect, useState } from 'react'
import type { Api } from '../../../shared/api'
import { errorMessage } from '../../../shared/api'
import { contactName } from '../../../entities/chat'
import type { ChatDispatch } from './chatReducer'

export function useChatDirectory(
    api: Api,
    dispatch: ChatDispatch,
    loadHistory: (chatId: string) => Promise<void>,
) {
    const [state, setState] = useState({ loading: true, error: '' })

    const loadContact = useCallback(
        async (chatId: string) => {
            const contact = await api.request('getContactInfo', { chatId })
            if (!api.signal.aborted) dispatch({ type: 'contact-loaded', chatId, contact })
        },
        [api, dispatch],
    )

    const reload = useCallback(async () => {
        setState({ loading: true, error: '' })
        try {
            const remote = await api.request('getChats')
            if (api.signal.aborted) return
            // В некоторых ответах GREEN-API поле type отсутствует. У групп ID отрицательный.
            const personal = remote.filter(
                (chat) =>
                    chat.type === 'user' ||
                    chat.type === 'bot' ||
                    (chat.type === undefined && !chat.chatId.startsWith('-')),
            )
            dispatch({ type: 'chats-loaded', chats: personal })
            // Чаты обогащаются последовательно с учётом лимитов API; сбой одного не останавливает остальные.
            for (const chat of personal) {
                if (api.signal.aborted) return
                await Promise.allSettled([
                    loadHistory(chat.chatId),
                    !contactName({ ...chat, username: undefined }, chat.chatId)
                        ? loadContact(chat.chatId)
                        : Promise.resolve(),
                ])
            }
            if (!api.signal.aborted) setState({ loading: false, error: '' })
        } catch (error) {
            if (!api.signal.aborted) setState({ loading: false, error: errorMessage(error) })
        }
    }, [api, dispatch, loadContact, loadHistory])

    useEffect(() => {
        void reload()
    }, [reload])
    return { ...state, reload, loadContact }
}
