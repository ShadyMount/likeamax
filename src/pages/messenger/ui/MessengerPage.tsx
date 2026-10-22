import type { Api } from '../../../shared/api'
import { useMessenger, Composer, NewChatForm } from '../../../features/messaging'
import { ChatSidebar } from '../../../widgets/chat-sidebar'
import { Conversation } from '../../../widgets/conversation'
import styles from './MessengerPage.module.css'

export function MessengerPage({ api, onDisconnect }: { api: Api; onDisconnect: () => void }) {
    const messenger = useMessenger(api)
    const history = messenger.history.chatId === messenger.activeId ? messenger.history : null

    return (
        <main className={`${styles.chatLayout} ${messenger.activeId ? styles.hasActiveChat : ''}`}>
            <ChatSidebar
                className={styles.sidebar}
                chats={messenger.chats}
                activeId={messenger.activeId}
                loading={messenger.list.loading}
                error={messenger.list.error}
                connectionError={messenger.pollError}
                onSelect={messenger.selectChat}
                onRetry={() => void messenger.list.reload()}
                onDisconnect={onDisconnect}
                newChat={(onClose) => (
                    <NewChatForm
                        phone={messenger.creation.phone}
                        creating={messenger.creation.creating}
                        error={messenger.creation.error}
                        onChange={messenger.creation.setPhone}
                        onSubmit={messenger.creation.submit}
                        onClose={onClose}
                    />
                )}
            />
            <Conversation
                className={styles.conversation}
                chat={messenger.active}
                loading={history?.loading ?? false}
                error={messenger.composer.error || messenger.pollError}
                historyError={history?.error ?? ''}
                onBack={() => messenger.selectChat('')}
                onRetry={messenger.history.retry}
                composer={
                    <Composer
                        draft={messenger.composer.draft}
                        sending={messenger.composer.sending}
                        onChange={messenger.composer.setDraft}
                        onSend={messenger.composer.send}
                    />
                }
            />
        </main>
    )
}
