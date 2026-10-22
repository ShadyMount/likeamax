// Подготовка через интерфейс: тест не подменяет состояние React и не вызывает другие сценарии.
export async function connectInstance(page, origin, remember = false) {
    await page.goto(origin)
    await page.getByLabel('ID инстанса').fill('4100000000')
    await page.getByLabel('Токен инстанса').fill('test-token')
    if (remember) await page.getByRole('checkbox', { name: 'Запомнить меня' }).check()
    await page.getByRole('button', { name: 'Подключиться' }).click()
    await page.getByRole('button', { name: 'Выйти' }).waitFor()
    await page
        .getByRole('button', { name: /Существующий диалог.*Старый исходящий текст/ })
        .waitFor()
    // Превью загружаются последовательно; ждём готовности списка до действий сценария.
    await page.getByText('Загрузка чатов…', { exact: true }).waitFor({ state: 'hidden' })
}

export async function openPhoneChat(page) {
    await page.getByRole('button', { name: 'Новый чат', exact: true }).click()
    await page.getByLabel('Новый чат по телефону').fill('+7 999 123-45-67')
    await page.getByRole('button', { name: 'Открыть', exact: true }).click()
    await page
        .getByRole('region', { name: 'Переписка' })
        .locator('header strong')
        .filter({ hasText: '+79991234567' })
        .waitFor()
}
