import { IoBookmarkOutline } from 'react-icons/io5'
import type { Chat } from '../model/types'
import { Avatar } from '../../../shared/ui'
import { formatChatTime } from '../../../shared/lib'
import { DeliveryStatus } from './DeliveryStatus'
import { uiStyles as ui } from '../../../shared/ui'
import styles from './ChatListItem.module.css'

type Props = { chat: Chat; selected: boolean; onSelect: () => void }

export function ChatListItem({ chat, selected, onSelect }: Props) {
    const last = chat.messages.at(-1)
    const preview =
        last?.text ||
        (chat.previewLoading
            ? 'Загрузка сообщения…'
            : chat.previewError
              ? 'Не удалось загрузить сообщение'
              : 'Нет текстовых сообщений')

    return (
        <button
            className={`${styles.chatItem} ${selected ? styles.selected : ''}`}
            onClick={onSelect}
            aria-current={selected ? 'true' : undefined}
        >
            <Avatar name={chat.title} icon={chat.isSaved ? <IoBookmarkOutline /> : undefined} />
            <span className={styles.chatSummary}>
                <span className={styles.chatTitleRow}>
                    <strong>{chat.title}</strong>
                    {last && (
                        <span className={styles.chatMeta}>
                            {last.outgoing && !chat.isSaved && (
                                <DeliveryStatus status={last.status} />
                            )}
                            <time dateTime={new Date(last.timestamp * 1000).toISOString()}>
                                {formatChatTime(last.timestamp)}
                            </time>
                        </span>
                    )}
                </span>
                <small className={ui.muted}>{preview}</small>
            </span>
        </button>
    )
}
