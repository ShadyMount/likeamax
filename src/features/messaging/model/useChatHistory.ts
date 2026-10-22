import { useCallback, useEffect, useRef, useState } from 'react'
import type { Api } from '../../../shared/api'
import { errorMessage } from '../../../shared/api'
import type { ChatDispatch } from './chatReducer'
import { mapHistoryMessages } from './messageMappers'

export function useChatHistory(api: Api, activeId: string, dispatch: ChatDispatch) {
    const requests = useRef(new Map<string, Promise<void>>())
    const [history, setHistory] = useState({ chatId: '', loading: false, error: '' })
    const [retry, setRetry] = useState(0)

    const loadHistory = useCallback(
        async (chatId: string) => {
            // Превью списка и открытая переписка используют один незавершённый запрос.
            // После завершения удаляем его из кэша, чтобы следующее открытие обновило историю.
            const pending = requests.current.get(chatId)
            if (pending) return pending
            dispatch({ type: 'history-loading', chatId })
            const request = api
                .request('getChatHistory', { chatId, count: 100 })
                .then((items) => {
                    if (!api.signal.aborted) {
                        dispatch({
                            type: 'history-loaded',
                            chatId,
                            messages: mapHistoryMessages(items),
                        })
                    }
                })
                .catch((error) => {
                    if (!api.signal.aborted) dispatch({ type: 'history-failed', chatId })
                    throw error
                })
            requests.current.set(chatId, request)
            try {
                await request
            } finally {
                requests.current.delete(chatId)
            }
        },
        [api, dispatch],
    )

    useEffect(() => {
        if (!activeId) return
        let ignore = false
        setHistory({ chatId: activeId, loading: true, error: '' })
        loadHistory(activeId)
            .then(() => {
                if (!ignore && !api.signal.aborted)
                    setHistory({ chatId: activeId, loading: false, error: '' })
            })
            .catch((error) => {
                if (!ignore && !api.signal.aborted) {
                    setHistory({ chatId: activeId, loading: false, error: errorMessage(error) })
                }
            })
        // Ответ сохраняется в данных чата, но после переключения не меняет состояние нового экрана.
        return () => {
            ignore = true
        }
    }, [api, activeId, retry, loadHistory])

    return { ...history, loadHistory, retry: () => setRetry((value) => value + 1) }
}
