import assert from 'node:assert/strict'
import test from 'node:test'
import {
    compareMessages,
    latestStatus,
    mergeMessages,
} from '../../src/entities/chat/model/messages.ts'

const message = { id: '10', text: 'Сообщение', outgoing: true, timestamp: 100, status: 'sent' }

test('Сортировка: запоздалое сообщение занимает место по времени отправки', () => {
    const messages = [
        { ...message, id: '30', timestamp: 300 },
        { ...message, id: '10', timestamp: 100 },
        { ...message, id: '20', timestamp: 200 },
    ]
    assert.deepEqual(
        messages.sort(compareMessages).map((item) => item.id),
        ['10', '20', '30'],
    )
})

test('Сортировка: при одной секунде ID сравниваются как числа без потери точности', () => {
    const ids = ['90071992547409931', '10', '90071992547409930', '2']
    const messages = ids.map((id) => ({ ...message, id }))
    assert.deepEqual(
        messages.sort(compareMessages).map((item) => item.id),
        ['2', '10', '90071992547409930', '90071992547409931'],
    )
})

test('Сортировка: одинаковые сообщения равны, нечисловые ID имеют стабильный порядок', () => {
    assert.equal(compareMessages(message, { ...message }), 0)
    const messages = ['incoming-b', 'incoming-a'].map((id) => ({ ...message, id }))
    assert.deepEqual(
        messages.sort(compareMessages).map((item) => item.id),
        ['incoming-a', 'incoming-b'],
    )
})

test('Слияние: повторное событие не создаёт дубль, входящие и исходящие с одинаковым ID различаются', () => {
    const incoming = { ...message, outgoing: false, status: undefined }
    const result = mergeMessages([message, incoming], [{ ...message }, { ...incoming }])
    assert.equal(result.length, 2)
    assert.deepEqual(result.map((item) => item.outgoing).sort(), [false, true])
})

test('Слияние: серверное время сохраняется при любом порядке ответа отправки и уведомления', () => {
    const local = { ...message, timestamp: 50, estimatedTime: true, status: 'queued' }
    const server = { ...message, timestamp: 200 }
    for (const [first, second] of [
        [local, server],
        [server, local],
    ]) {
        const result = mergeMessages([first], [second])
        assert.equal(result.length, 1)
        assert.equal(result[0].timestamp, 200)
        assert.equal(result[0].estimatedTime, undefined)
        assert.equal(result[0].status, 'sent')
    }
})

test('Слияние: повторная история не отменяет прочтение и не теряет новые сообщения', () => {
    const read = { ...message, status: 'read' }
    const recent = { ...message, id: '20', timestamp: 200 }
    const result = mergeMessages([message], [read, recent])
    assert.deepEqual(
        result.map((item) => [item.id, item.status]),
        [
            ['10', 'read'],
            ['20', 'sent'],
        ],
    )
})

test('Статусы: устаревшее событие не откатывает доставку, прочтение или ошибку', () => {
    for (const [current, delayed] of [
        ['sent', 'queued'],
        ['delivered', 'sent'],
        ['read', 'delivered'],
        ['failed', 'read'],
        ['noAccount', 'sent'],
    ]) {
        assert.equal(latestStatus(current, delayed), current)
        assert.equal(latestStatus(delayed, current), current)
    }
    assert.equal(latestStatus(undefined, 'read'), 'read')
    assert.equal(latestStatus('read', undefined), 'read')
    assert.equal(latestStatus(undefined, undefined), undefined)
})

test('Слияние не изменяет исходные массивы и сообщения', () => {
    const original = Object.freeze({ ...message })
    const first = Object.freeze([original])
    const second = Object.freeze([{ ...message, status: 'read' }])
    const result = mergeMessages(first, second)
    assert.equal(original.status, 'sent')
    assert.equal(first.length, 1)
    assert.equal(result[0].status, 'read')
    assert.notEqual(result[0], original)
})
