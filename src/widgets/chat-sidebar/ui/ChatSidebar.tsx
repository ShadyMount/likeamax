import { useState } from 'react'
import type { ReactNode } from 'react'
import { IoCreateOutline, IoLogOutOutline, IoSearchOutline } from 'react-icons/io5'
import type { Chat } from '../../../entities/chat'
import { ChatListItem } from '../../../entities/chat'
import { uiStyles as ui } from '../../../shared/ui'
import styles from './ChatSidebar.module.css'

type Props = {
    className?: string
    chats: Chat[]
    activeId: string
    loading: boolean
    error: string
    connectionError: string
    onSelect: (id: string) => void
    onRetry: () => void
    onDisconnect: () => void
    newChat: (onClose: () => void) => ReactNode
}

export function ChatSidebar({
    className = '',
    chats,
    activeId,
    loading,
    error,
    connectionError,
    onSelect,
    onRetry,
    onDisconnect,
    newChat,
}: Props) {
    const [search, setSearch] = useState('')
    const [creating, setCreating] = useState(false)
    const query = search.trim().toLocaleLowerCase('ru-RU')
    const filtered = chats.filter((chat) =>
        `${chat.title} ${chat.phone ?? ''}`.toLocaleLowerCase('ru-RU').includes(query),
    )

    return (
        <aside className={`${styles.sidebar} ${className}`} aria-label="Список чатов">
            <header className={styles.sidebarHeader}>
                <div className={styles.sidebarHeading}>
                    <strong>Telegram</strong>
                    <button
                        className={`${ui.iconButton} ${styles.logoutButton}`}
                        aria-label="Выйти"
                        title="Выйти"
                        onClick={onDisconnect}
                    >
                        <IoLogOutOutline />
                    </button>
                </div>
                <label className={`${ui.label} ${styles.searchField}`}>
                    <IoSearchOutline aria-hidden="true" />
                    <input
                        className={ui.input}
                        aria-label="Поиск чатов"
                        placeholder="Поиск"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>
            </header>
            {creating && newChat(() => setCreating(false))}
            {loading && (
                <p className={styles.listEmpty} role="status">
                    Загрузка чатов…
                </p>
            )}
            {error && (
                <div className={ui.error} role="alert">
                    {error}
                    <button className={ui.textButton} onClick={onRetry}>
                        Повторить загрузку чатов
                    </button>
                </div>
            )}
            <nav className={styles.chatList} aria-label="Диалоги">
                {!loading && !error && !chats.length && (
                    <p className={styles.listEmpty}>Создайте новый чат, чтобы начать переписку.</p>
                )}
                {!!query && !filtered.length && <p className={styles.listEmpty}>Чаты не найдены</p>}
                {filtered.map((chat) => (
                    <ChatListItem
                        key={chat.id}
                        chat={chat}
                        selected={activeId === chat.id}
                        onSelect={() => onSelect(chat.id)}
                    />
                ))}
            </nav>
            <div className={styles.sidebarFooter}>
                <p
                    className={`${styles.connection} ${connectionError ? styles.reconnecting : ''}`}
                    role="status"
                >
                    {connectionError ? 'Переподключение…' : 'Подключено'}
                </p>
                <button
                    className={`${ui.roundButton} ${styles.newChatButton}`}
                    aria-label="Новый чат"
                    title="Новый чат"
                    aria-expanded={creating}
                    onClick={() => setCreating((value) => !value)}
                >
                    <IoCreateOutline />
                </button>
            </div>
        </aside>
    )
}
