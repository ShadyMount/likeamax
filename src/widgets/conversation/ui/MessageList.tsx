import { Fragment, useEffect, useRef } from 'react'
import { IoChatbubblesOutline } from 'react-icons/io5'
import type { Chat } from '../../../entities/chat'
import { MessageBubble } from '../../../entities/chat'
import { dayKey, formatDay } from '../../../shared/lib'
import styles from './Conversation.module.css'

type Props = {
    chat?: Chat
    loading: boolean
    historyError: string
}

export function MessageList({ chat, loading, historyError }: Props) {
    const scroller = useRef<HTMLDivElement>(null)
    const stickToBottom = useRef(true)
    const previousChat = useRef<string | undefined>(undefined)

    useEffect(() => {
        const element = scroller.current
        if (!element) return
        // Новое сообщение не прокручивает вниз, если пользователь читает старую часть переписки.
        if (previousChat.current !== chat?.id || stickToBottom.current)
            element.scrollTop = element.scrollHeight
        previousChat.current = chat?.id
    }, [chat?.id, chat?.messages.length])

    return (
        <div
            className={styles.messages}
            ref={scroller}
            role="log"
            aria-label="Сообщения"
            aria-live="polite"
            onScroll={(event) => {
                const element = event.currentTarget
                stickToBottom.current =
                    element.scrollHeight - element.scrollTop - element.clientHeight < 80
            }}
        >
            {!chat && (
                <div className={styles.emptyState}>
                    <IoChatbubblesOutline aria-hidden="true" />
                    <h1>Ваши сообщения</h1>
                    <p>Выберите чат или начните новый разговор</p>
                </div>
            )}
            {chat && (
                <>
                    <div className={styles.messagesSpacer} />
                    {loading && !chat.messages.length && (
                        <p className={styles.conversationEmpty} role="status">
                            Загрузка сообщений…
                        </p>
                    )}
                    {!loading && !historyError && !chat.messages.length && (
                        <p className={styles.conversationEmpty}>Текстовых сообщений пока нет</p>
                    )}
                    {chat.messages.map((message, index) => (
                        <Fragment key={`${message.outgoing}-${message.id}`}>
                            {(index === 0 ||
                                dayKey(message.timestamp) !==
                                    dayKey(chat.messages[index - 1].timestamp)) && (
                                <div className={styles.dateDivider} data-testid="message-date">
                                    <span>{formatDay(message.timestamp)}</span>
                                </div>
                            )}
                            <MessageBubble message={message} />
                        </Fragment>
                    ))}
                </>
            )}
        </div>
    )
}
