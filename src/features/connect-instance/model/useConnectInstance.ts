import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { errorMessage } from '../../../shared/api'
import type { Api } from '../../../shared/api'
import { authorizeInstance } from './authorizeInstance'
import { forgetInstance, readRememberedInstance, rememberInstance } from './rememberedInstance'

export function useConnectInstance(onConnect: (api: Api) => void) {
    const [remembered] = useState(readRememberedInstance)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(!!remembered)

    useEffect(() => {
        if (!remembered) return
        let cancelled = false
        // Сохранённые реквизиты заново проверяются: авторизация и Telegram ID могли измениться.
        void authorizeInstance(remembered)
            .then((api) => {
                if (cancelled) api.abort()
                else onConnect(api)
            })
            .catch((error) => {
                if (cancelled) return
                forgetInstance()
                setError(
                    `Не удалось восстановить вход. ${errorMessage(error)} Введите реквизиты повторно.`,
                )
                setBusy(false)
            })
        return () => {
            cancelled = true
        }
    }, [remembered, onConnect])

    async function connect(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (busy) return
        const values = new FormData(event.currentTarget)
        const credentials = {
            apiUrl: String(values.get('apiUrl')).trim(),
            idInstance: String(values.get('idInstance')).trim(),
            apiTokenInstance: String(values.get('apiTokenInstance')).trim(),
        }
        setBusy(true)
        setError('')
        let api: Api | undefined
        try {
            api = await authorizeInstance(credentials)
            // Сохраняем только после успешной проверки и только с явным согласием пользователя.
            if (values.get('remember') === 'on') rememberInstance(credentials)
            else forgetInstance()
            onConnect(api)
        } catch (error) {
            api?.abort()
            setError(errorMessage(error))
        } finally {
            setBusy(false)
        }
    }

    return { busy, error, connect }
}
