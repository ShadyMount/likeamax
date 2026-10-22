import { useState } from 'react'
import type { Api } from '../shared/api'
import { ConnectForm } from '../features/connect-instance'
import { MessengerPage } from '../pages/messenger'

export function App() {
    const [api, setApi] = useState<Api | null>(null)

    function disconnect() {
        api?.abort()
        setApi(null)
    }

    return api ? (
        <MessengerPage api={api} onDisconnect={disconnect} />
    ) : (
        <ConnectForm onConnect={setApi} />
    )
}
