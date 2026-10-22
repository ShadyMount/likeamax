import type { ApiMethods, Credentials } from './types'

export function createApi(credentials: Credentials) {
    const controller = new AbortController()
    const nextRequests = new Map<string, number>()
    const url = new URL(credentials.apiUrl)
    if (
        url.protocol !== 'https:' ||
        !/^(?:[a-z0-9-]+\.)*green-api\.com$/.test(url.hostname) ||
        url.username ||
        url.password ||
        url.port ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
    ) {
        throw new Error('Укажите HTTPS apiUrl из кабинета GREEN-API, без пути и параметров.')
    }

    async function request<M extends keyof ApiMethods>(
        method: M,
        ...args: ApiMethods[M]['args']
    ): Promise<ApiMethods[M]['response']> {
        // У DELETE идентификатор идёт в URL; у POST передаётся объект тела запроса.
        const [payload] = args
        const receiptId = typeof payload === 'number' ? payload : undefined
        const body = typeof payload === 'object' ? payload : undefined
        if (method === 'getChatHistory' || method === 'getContactInfo') {
            // Бронируем время старта до ожидания: параллельные превью не попадут в один слот.
            const start = Math.max(Date.now(), nextRequests.get(method) ?? 0)
            nextRequests.set(method, start + 1100)
            await new Promise((resolve) => setTimeout(resolve, Math.max(0, start - Date.now())))
        }
        const endpoint = `${url.origin}/waInstance${encodeURIComponent(credentials.idInstance)}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}`
        const suffix = receiptId === undefined ? '' : `/${receiptId}`
        const query = method === 'receiveNotification' ? '?receiveTimeout=5' : ''
        const response = await fetch(endpoint + suffix + query, {
            method: receiptId !== undefined ? 'DELETE' : body ? 'POST' : 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            // Общий сигнал завершает сессию, таймаут ограничивает только текущий запрос.
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
            credentials: 'omit',
        })
        if (!response.ok) {
            const explanation =
                response.status === 401 || response.status === 403
                    ? 'Проверьте реквизиты и доступ к инстансу.'
                    : 'Проверьте настройки инстанса или повторите позже.'
            throw new Error(`Ошибка GREEN-API (${response.status}). ${explanation}`)
        }
        const text = await response.text()
        const data = text ? JSON.parse(text) : null
        if (data?.status === 'error' || data?.status === false) {
            throw new Error(
                'GREEN-API отклонил запрос. Проверьте авторизацию, настройки и ограничения инстанса.',
            )
        }
        return data as ApiMethods[M]['response']
    }

    return { selfChatId: '', request, signal: controller.signal, abort: () => controller.abort() }
}

export type Api = ReturnType<typeof createApi>

export function errorMessage(error: unknown) {
    if (error instanceof TypeError) return 'Нет соединения с API. Проверьте сеть и apiUrl.'
    if (error instanceof Error && error.name === 'TimeoutError')
        return 'API не ответил вовремя. Повторите попытку.'
    return error instanceof Error ? error.message : 'Не удалось выполнить запрос.'
}
