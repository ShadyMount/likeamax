import type { ReactNode } from 'react'
import { IoArrowBack } from 'react-icons/io5'
import type { Chat } from '../../../entities/chat'
import { Avatar, uiStyles as ui } from '../../../shared/ui'
import { MessageList } from './MessageList'
import styles from './Conversation.module.css'

type Props = {
    className?: string
    chat?: Chat
    loading: boolean
    error: string
    historyError: string
    onBack: () => void
    onRetry: () => void
    composer: ReactNode
}

export function Conversation({
    className = '',
    chat,
    loading,
    error,
    historyError,
    onBack,
    onRetry,
    composer,
}: Props) {
    return (
        <section className={`${styles.conversation} ${className}`} aria-label="Переписка">
            {chat && (
                <header className={styles.conversationHeader}>
                    <button
                        className={`${ui.iconButton} ${styles.backButton}`}
                        aria-label="Назад к чатам"
                        onClick={onBack}
                    >
                        <IoArrowBack />
                    </button>
                    <Avatar name={chat.title} className={styles.avatar} />
                    <div className={styles.conversationTitle}>
                        <strong>{chat.title}</strong>
                        <small className={ui.muted}>Личный чат</small>
                    </div>
                </header>
            )}
            {error && (
                <div className={`${ui.error} ${styles.chatError}`} role="alert">
                    {error}
                </div>
            )}
            {historyError && (
                <div className={`${ui.error} ${styles.chatError}`} role="alert">
                    {historyError}
                    <button className={ui.textButton} onClick={onRetry}>
                        Повторить загрузку истории
                    </button>
                </div>
            )}
            <MessageList chat={chat} loading={loading} historyError={historyError} />
            {chat && composer}
        </section>
    )
}
