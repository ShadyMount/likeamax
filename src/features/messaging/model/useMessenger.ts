import { useReducer, useState } from 'react'
import type { Api } from '../../../shared/api'
import { compareMessages } from '../../../entities/chat'
import { chatReducer, initialChatState } from './chatReducer'
import { useChatDirectory } from './useChatDirectory'
import { useChatHistory } from './useChatHistory'
import { useCreateChat } from './useCreateChat'
import { useMessageComposer } from './useMessageComposer'
import { useMessageNotifications } from './useMessageNotifications'

export function useMessenger(api: Api) {
    const [state, dispatch] = useReducer(chatReducer, {
        ...initialChatState,
        selfChatId: api.selfChatId,
    })
    const [activeId, setActiveId] = useState('')
    const active = state.chats.find((chat) => chat.id === activeId)

    const { loadHistory, ...history } = useChatHistory(api, activeId, dispatch)
    const { loadContact, ...list } = useChatDirectory(api, dispatch, loadHistory)
    const { setError, ...composer } = useMessageComposer(api, active, dispatch, loadHistory)
    const creation = useCreateChat({
        api,
        chats: state.chats,
        dispatch,
        onOpen: setActiveId,
        loadContact,
    })

    const pollError = useMessageNotifications(api, dispatch, setError)
    const chats = [...state.chats].sort((a, b) => {
        const first = a.messages.at(-1)
        const second = b.messages.at(-1)
        return first && second ? compareMessages(second, first) : Number(!!second) - Number(!!first)
    })

    function selectChat(chatId: string) {
        setActiveId(chatId)
        setError('')
    }

    return { chats, active, activeId, selectChat, list, history, creation, composer, pollError }
}
