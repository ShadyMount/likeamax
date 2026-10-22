const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

export function formatTime(timestamp: number) {
    return timeFormatter.format(new Date(timestamp * 1000))
}

export function dayKey(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleDateString('sv-SE')
}

export function formatDay(timestamp: number) {
    const date = new Date(timestamp * 1000)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Сегодня'
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера'
    return (
        dateFormatter.format(date) +
        (date.getFullYear() === today.getFullYear() ? '' : ` ${date.getFullYear()}`)
    )
}

export function formatChatTime(timestamp: number) {
    return dayKey(timestamp) === dayKey(Date.now() / 1000)
        ? formatTime(timestamp)
        : new Date(timestamp * 1000).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
          })
}
