import type { Message } from '../model/types'
import { formatTime } from '../../../shared/lib'
import { DeliveryStatus } from './DeliveryStatus'
import styles from './MessageBubble.module.css'

export function MessageBubble({
    message,
    showStatus = true,
}: {
    message: Message
    showStatus?: boolean
}) {
    return (
        <article
            className={`${styles.message} ${message.outgoing ? styles.outgoing : ''}`}
            data-direction={message.outgoing ? 'outgoing' : 'incoming'}
        >
            <p>{message.text}</p>
            <footer>
                <time dateTime={new Date(message.timestamp * 1000).toISOString()}>
                    {formatTime(message.timestamp)}
                </time>
                {message.outgoing && showStatus && <DeliveryStatus status={message.status} />}
            </footer>
        </article>
    )
}
