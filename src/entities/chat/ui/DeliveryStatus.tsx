import { IoAlertCircleOutline, IoCheckmark, IoCheckmarkDone, IoTimeOutline } from 'react-icons/io5'
import { statusLabels } from '../model/messages'
import { uiStyles as ui } from '../../../shared/ui'
import styles from './DeliveryStatus.module.css'

export function DeliveryStatus({ status }: { status?: string }) {
    if (!status || !statusLabels[status]) return null
    const Icon =
        status === 'read' || status === 'delivered'
            ? IoCheckmarkDone
            : status === 'failed' || status === 'noAccount'
              ? IoAlertCircleOutline
              : status === 'queued'
                ? IoTimeOutline
                : IoCheckmark
    return (
        <span
            className={`${styles.deliveryStatus} ${styles[status] ?? ''}`}
            title={statusLabels[status]}
        >
            <Icon aria-hidden="true" />
            <span className={ui.srOnly}>{statusLabels[status]}</span>
        </span>
    )
}
