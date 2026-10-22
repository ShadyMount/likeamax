import type { ReactNode } from 'react'
import styles from './Avatar.module.css'
const colors = ['#c76363', '#be8651', '#729957', '#538fb4', '#8c79c6', '#bd6892']

export function Avatar({
    name,
    className = '',
    icon,
}: {
    name: string
    className?: string
    icon?: ReactNode
}) {
    const hash = Array.from(name).reduce(
        (result, character) => result + character.codePointAt(0)!,
        0,
    )
    const initials = name
        .replace(/^\+/, '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => Array.from(part)[0])
        .join('')
    return (
        <span
            className={`${styles.avatar} ${className}`}
            style={{ backgroundColor: colors[hash % colors.length] }}
            aria-hidden="true"
        >
            {icon ?? initials}
        </span>
    )
}
