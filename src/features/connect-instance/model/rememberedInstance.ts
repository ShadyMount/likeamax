import type { Credentials } from '../../../shared/api'

const key = 'likeamax.remembered-instance'

export function forgetInstance() {
    try {
        localStorage.removeItem(key)
    } catch {
        // Хранилище может быть запрещено настройками браузера; вход в памяти всё равно завершается.
    }
}

export function readRememberedInstance(): Credentials | null {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const value: unknown = JSON.parse(raw)
        if (
            value &&
            typeof value === 'object' &&
            'apiUrl' in value &&
            typeof value.apiUrl === 'string' &&
            value.apiUrl &&
            'idInstance' in value &&
            typeof value.idInstance === 'string' &&
            value.idInstance &&
            'apiTokenInstance' in value &&
            typeof value.apiTokenInstance === 'string' &&
            value.apiTokenInstance
        ) {
            return {
                apiUrl: value.apiUrl,
                idInstance: value.idInstance,
                apiTokenInstance: value.apiTokenInstance,
            }
        }
    } catch {
        // Повреждённая запись или запрет доступа не должны мешать открыть форму входа.
    }
    forgetInstance()
    return null
}

export function rememberInstance(credentials: Credentials) {
    try {
        localStorage.setItem(key, JSON.stringify(credentials))
    } catch {
        throw new Error(
            'Браузер не разрешает сохранить реквизиты. Снимите галочку «Запомнить меня» и повторите вход.',
        )
    }
}
