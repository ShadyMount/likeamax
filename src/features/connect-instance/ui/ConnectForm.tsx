import { IoPaperPlane } from 'react-icons/io5'
import type { Api } from '../../../shared/api'
import { uiStyles as ui } from '../../../shared/ui'
import { useConnectInstance } from '../model/useConnectInstance'
import styles from './ConnectForm.module.css'

export function ConnectForm({ onConnect }: { onConnect: (api: Api) => void }) {
    const { busy, error, connect } = useConnectInstance(onConnect)

    return (
        <main className={styles.loginPage}>
            <form className={styles.loginCard} onSubmit={connect}>
                <div className={styles.telegramMark} aria-hidden="true">
                    <IoPaperPlane />
                </div>
                <h1>Telegram</h1>
                <p className={styles.subtitle}>Текстовые сообщения через GREEN-API</p>
                <label className={ui.label}>
                    ID инстанса
                    <input
                        className={ui.input}
                        name="idInstance"
                        inputMode="numeric"
                        pattern="[0-9]+"
                        placeholder="4100000000"
                        required
                        autoComplete="off"
                    />
                </label>
                <label className={ui.label}>
                    Токен инстанса
                    <input
                        className={ui.input}
                        name="apiTokenInstance"
                        type="password"
                        required
                        autoComplete="off"
                    />
                </label>
                <label className={ui.label}>
                    API URL
                    <input
                        className={ui.input}
                        name="apiUrl"
                        type="url"
                        defaultValue="https://4100.api.green-api.com"
                        required
                        autoComplete="off"
                    />
                </label>
                <p className={styles.hint}>
                    Скопируйте реквизиты Telegram-инстанса из{' '}
                    <a
                        className={ui.link}
                        href="https://console.green-api.com/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        кабинета GREEN-API
                    </a>
                    . Инстанс должен быть авторизован, входящие уведомления включены, Webhook URL
                    пуст.
                </p>
                <div>
                    <label className={styles.remember}>
                        <input
                            type="checkbox"
                            name="remember"
                            aria-describedby="remember-warning"
                            disabled={busy}
                        />
                        Запомнить меня на 24 часа
                    </label>
                    <p id="remember-warning" className={styles.hint}>
                        Небезопасно: токен сохраняется в этом браузере и доступен JavaScript-коду
                        сайта. Не включайте на чужом или общем устройстве.
                    </p>
                </div>
                {error && (
                    <p className={ui.error} role="alert">
                        {error}
                    </p>
                )}
                <button className={ui.primary} disabled={busy}>
                    {busy ? 'Подключение…' : 'Подключиться'}
                </button>
                <p className={styles.footnote}>
                    Без галочки реквизиты хранятся только до перезагрузки. Переписка и черновики не
                    сохраняются.
                </p>
            </form>
        </main>
    )
}
