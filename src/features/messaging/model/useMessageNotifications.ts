import { useEffect, useState } from 'react'
import type { Api } from '../../../shared/api'
import { errorMessage } from '../../../shared/api'
import type { ChatDispatch } from './chatReducer'
import { mapNotification } from './messageMappers'

export function useMessageNotifications(
    api: Api,
    dispatch: ChatDispatch,
    onDeliveryError: (error: string) => void,
) {
    const [error, setError] = useState('')
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>
        async function poll() {
            try {
                const notification = await api.request('receiveNotification')
                if (api.signal.aborted) return
                if (notification) {
                    const event = mapNotification(notification.body)
                    if (event?.type === 'delivery-error') onDeliveryError(event.error)
                    else if (event) dispatch(event)
                    // Сначала применяем событие, затем подтверждаем его. Повтор не создаст дубль.
                    // Неподдерживаемые события тоже подтверждаем, чтобы они не блокировали очередь.
                    const result = await api.request('deleteNotification', notification.receiptId)
                    if (!result.result)
                        throw new Error(
                            'Не удалось подтвердить получение уведомления. Повторяем попытку.',
                        )
                }
                if (!api.signal.aborted) {
                    setError('')
                    timer = setTimeout(poll, 300)
                }
            } catch (error) {
                if (!api.signal.aborted) {
                    setError(`${errorMessage(error)} Повтор через 5 секунд.`)
                    timer = setTimeout(poll, 5000)
                }
            }
        }
        // Следующий запрос начинается только после обработки и подтверждения предыдущего.
        void poll()
        return () => {
            clearTimeout(timer)
            api.abort()
        }
    }, [api, dispatch, onDeliveryError])
    return error
}
