import type { SubmitEvent } from 'react'
import { IoCloseOutline } from 'react-icons/io5'
import { uiStyles as ui } from '../../../shared/ui'
import styles from './NewChatForm.module.css'

type Props = {
    phone: string
    creating: boolean
    error: string
    onChange: (value: string) => void
    onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
    onClose: () => void
}

export function NewChatForm({ phone, creating, error, onChange, onSubmit, onClose }: Props) {
    return (
        <form className={styles.newChat} onSubmit={onSubmit}>
            <div className={styles.newChatHeading}>
                <label className={ui.label} htmlFor="phone">
                    Новый чат по телефону
                </label>
                <button
                    className={`${ui.iconButton} ${styles.closeButton}`}
                    type="button"
                    aria-label="Закрыть создание чата"
                    onClick={onClose}
                >
                    <IoCloseOutline />
                </button>
            </div>
            <div className={styles.phoneRow}>
                <input
                    className={ui.input}
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="+7 999 123-45-67"
                    required
                    autoFocus
                />
                <button className={`${ui.primary} ${styles.submitButton}`} disabled={creating}>
                    {creating ? '…' : 'Открыть'}
                </button>
            </div>
            {error && (
                <p className={ui.error} role="alert">
                    {error}
                </p>
            )}
        </form>
    )
}
