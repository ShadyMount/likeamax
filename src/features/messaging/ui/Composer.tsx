import { useLayoutEffect, useRef } from 'react'
import type { SubmitEvent } from 'react'
import { IoSend } from 'react-icons/io5'
import { uiStyles as ui } from '../../../shared/ui'
import styles from './Composer.module.css'

type Props = {
    draft: string
    sending: boolean
    onChange: (text: string) => void
    onSend: (event: SubmitEvent<HTMLFormElement>) => void
}

export function Composer({ draft, sending, onChange, onSend }: Props) {
    const input = useRef<HTMLTextAreaElement>(null)

    useLayoutEffect(() => {
        if (!input.current) return
        // Сброс высоты позволяет полю уменьшиться после удаления текста или отправки.
        input.current.style.height = 'auto'
        input.current.style.height = `${Math.min(input.current.scrollHeight, 160)}px`
    }, [draft])

    return (
        <form className={styles.composer} onSubmit={onSend}>
            <textarea
                className={ui.input}
                ref={input}
                aria-label="Текст сообщения"
                placeholder="Сообщение"
                maxLength={4096}
                rows={1}
                value={draft}
                disabled={sending}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                    if (
                        event.key === 'Enter' &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                    ) {
                        event.preventDefault()
                        event.currentTarget.form?.requestSubmit()
                    }
                }}
            />
            <button
                className={`${ui.roundButton} ${styles.sendButton}`}
                aria-label={sending ? 'Отправка…' : 'Отправить'}
                disabled={sending || !draft.trim()}
            >
                <IoSend aria-hidden="true" />
            </button>
        </form>
    )
}
