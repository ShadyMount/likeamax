export type Credentials = { apiUrl: string; idInstance: string; apiTokenInstance: string }

export type Notification = {
    receiptId: number
    body: {
        typeWebhook: string
        idMessage: string
        timestamp: number
        chatId?: string
        status?: string
        senderData?: { chatId: string; chatType?: string; senderName?: string; chatName?: string }
        messageData?: {
            typeMessage: string
            textMessageData?: { textMessage: string }
            extendedTextMessageData?: { text: string }
        }
    }
}

export type ContactInfo = {
    name?: string
    contactName?: string
    username?: string
    phoneNumber?: number
}
export type RemoteChat = ContactInfo & { chatId: string; type?: string }
export type HistoryMessage = {
    idMessage: string
    type: 'incoming' | 'outgoing'
    typeMessage: string
    timestamp: number
    textMessage?: string
    statusMessage?: string
    isDeleted?: boolean
}

// Описаны только методы, используемые приложением. Ответ выводится из имени метода.
export type ApiMethods = {
    getStateInstance: { args: []; response: { stateInstance: string } }
    getAccountSettings: { args: []; response: { chatId: string } }
    getSettings: { args: []; response: { webhookUrl?: string; incomingWebhook?: string } }
    getChats: { args: []; response: RemoteChat[] }
    getContactInfo: { args: [body: { chatId: string }]; response: ContactInfo }
    getChatHistory: {
        args: [body: { chatId: string; count: number }]
        response: HistoryMessage[]
    }
    checkAccount: {
        args: [body: { phoneNumber: number }]
        response: { exist: boolean; chatId: string }
    }
    sendMessage: {
        args: [body: { chatId: string; message: string }]
        response: { idMessage: string }
    }
    receiveNotification: { args: []; response: Notification | null }
    deleteNotification: { args: [receiptId: number]; response: { result: boolean } }
}
