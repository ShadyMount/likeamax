import type { Credentials } from '../../../shared/api'

const key = 'likeamax.remembered-instance'
const rememberDurationMs = 24 * 60 * 60 * 1000
type RememberedInstance = Credentials & { expiresAt: number }

export function forgetInstance() {
    try {
        localStorage.removeItem(key)
    } catch {
        // Хранилище может быть запрещено настройками браузера; вход в памяти всё равно завершается.
    }
}

function readStoredInstance(): RememberedInstance | null {
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
            value.apiTokenInstance &&
            'expiresAt' in value &&
            typeof value.expiresAt === 'number' &&
            Number.isFinite(value.expiresAt) &&
            value.expiresAt > Date.now()
        ) {
            return {
                apiUrl: value.apiUrl,
                idInstance: value.idInstance,
                apiTokenInstance: value.apiTokenInstance,
                expiresAt: value.expiresAt,
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
        localStorage.setItem(
            key,
            JSON.stringify({ ...credentials, expiresAt: Date.now() + rememberDurationMs }),
        )
    } catch {
        throw new Error(
            'Браузер не разрешает сохранить реквизиты. Снимите галочку «Запомнить меня» и повторите вход.',
        )
    }
}

export function readRememberedInstance(): Credentials | null {
    const stored = readStoredInstance()
    if (!stored) return null
    return {
        apiUrl: stored.apiUrl,
        idInstance: stored.idInstance,
        apiTokenInstance: stored.apiTokenInstance,
    }
}

export function scheduleRememberedInstanceExpiry() {
    const stored = readStoredInstance()
    if (!stored) return
    // Пока вкладка открыта, удаляем истёкшую запись таймером. Если браузер закрыт,
    // проверка срока сработает при следующем запуске. Восстановление не продлевает срок.
    const timer = setTimeout(
        () => {
            // Повторное чтение не удалит более новую запись, созданную в другой вкладке.
            readStoredInstance()
        },
        Math.max(0, stored.expiresAt - Date.now()),
    )
    return () => clearTimeout(timer)
}
