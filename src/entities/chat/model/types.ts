export type Message = {
    id: string
    text: string
    outgoing: boolean
    timestamp: number
    status?: string
    estimatedTime?: boolean
}

export type Chat = {
    id: string
    title: string
    phone?: string
    messages: Message[]
    previewLoading?: boolean
    previewError?: boolean
}
