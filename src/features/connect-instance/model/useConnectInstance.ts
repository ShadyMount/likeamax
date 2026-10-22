import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { createApi, errorMessage } from '../../../shared/api'
import type { Api } from '../../../shared/api'

export function useConnectInstance(onConnect: (api: Api) => void) {
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    async function connect(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (busy) return
        const values = new FormData(event.currentTarget)
        setBusy(true)
        setError('')
        let candidate: Api | undefined
        try {
            candidate = createApi({
                apiUrl: String(values.get('apiUrl')).trim(),
                idInstance: String(values.get('idInstance')).trim(),
                apiTokenInstance: String(values.get('apiTokenInstance')).trim(),
            })
            const state = await candidate.request('getStateInstance')
            if (state.stateInstance !== 'authorized')
                throw new Error('Сначала авторизуйте Telegram-инстанс в кабинете GREEN-API.')
            // Пользовательский Webhook URL отключает HTTP-очередь: проверяем её доступность до входа.
            const settings = await candidate.request('getSettings')
            if (settings.webhookUrl || settings.incomingWebhook !== 'yes') {
                throw new Error(
                    'В кабинете GREEN-API очистите Webhook URL и включите получение входящих сообщений. После изменения подождите около минуты.',
                )
            }
            const account = await candidate.request('getAccountSettings')
            onConnect({ ...candidate, selfChatId: account.chatId })
        } catch (error) {
            candidate?.abort()
            setError(errorMessage(error))
        } finally {
            setBusy(false)
        }
    }

    return { busy, error, connect }
}
