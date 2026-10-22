import { createApi } from '../../../shared/api'
import type { Credentials } from '../../../shared/api'

export async function authorizeInstance(credentials: Credentials) {
    const api = createApi(credentials)
    try {
        const state = await api.request('getStateInstance')
        if (state.stateInstance !== 'authorized')
            throw new Error('Сначала авторизуйте Telegram-инстанс в кабинете GREEN-API.')
        // Пользовательский Webhook URL отключает HTTP-очередь: проверяем её доступность до входа.
        const settings = await api.request('getSettings')
        if (settings.webhookUrl || settings.incomingWebhook !== 'yes') {
            throw new Error(
                'В кабинете GREEN-API очистите Webhook URL и включите получение входящих сообщений. После изменения подождите около минуты.',
            )
        }
        const account = await api.request('getAccountSettings')
        return { ...api, selfChatId: account.chatId }
    } catch (error) {
        api.abort()
        throw error
    }
}
