import assert from 'node:assert/strict'

export async function checkSecurityPolicy(page, api, origin) {
    const response = await page.goto(origin)
    const headers = response.headers()
    const policy = headers['content-security-policy']
    assert.ok(policy, 'Собранное приложение должно отдавать CSP')
    assert.match(policy, /script-src 'self';/)
    assert.match(policy, /script-src-attr 'none'/)
    assert.match(policy, /frame-ancestors 'none'/)
    assert.match(policy, /connect-src https:\/\/green-api.com https:\/\/\*\.green-api.com/)
    assert.equal(headers['x-content-type-options'], 'nosniff')
    assert.equal(headers['x-frame-options'], 'DENY')
    assert.equal(headers['referrer-policy'], 'no-referrer')

    // Без CSP этот маршрут успешно ответил бы; блокировку проверяем до выхода запроса в сеть.
    let externalRequest = false
    await page.route('https://example.com/security-probe', async (route) => {
        externalRequest = true
        await route.fulfill({
            status: 200,
            body: 'ok',
            headers: { 'Access-Control-Allow-Origin': '*' },
        })
    })
    const blocked = await page.evaluate(async () => {
        try {
            await fetch('https://example.com/security-probe')
            return false
        } catch {
            return true
        }
    })
    assert.equal(blocked, true)
    assert.equal(externalRequest, false)

    // Сам evaluate выполняется инструментом тестирования, но вставленный script обязан блокироваться браузером.
    const inlineExecuted = await page.evaluate(() => {
        const script = document.createElement('script')
        script.textContent = 'window.inlineSecurityProbe = true'
        document.head.append(script)
        script.remove()
        return window.inlineSecurityProbe === true
    })
    assert.equal(inlineExecuted, false)

    // Тело ошибочного ответа API не должно попадать в интерфейс и раскрывать токен.
    api.invalidJson = true
    await page.getByLabel('ID инстанса').fill('4100000000')
    await page.getByLabel('Токен инстанса').fill('test-token')
    await page.getByRole('checkbox', { name: 'Запомнить меня' }).check()
    await page.getByRole('button', { name: 'Подключиться' }).click()
    await page
        .getByRole('alert')
        .filter({ hasText: 'GREEN-API вернул некорректный ответ' })
        .waitFor()
    assert.doesNotMatch(await page.getByRole('alert').innerText(), /test-token/)
    assert.equal(
        await page.evaluate(() => localStorage.getItem('likeamax.remembered-instance')),
        null,
    )
}
