import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { connectInstance, openPhoneChat } from '../helpers/session.mjs'

export async function checkSearchAndDateSeparators(page, origin) {
    await connectInstance(page, origin)
    await openPhoneChat(page)
    await page.getByRole('button', { name: /Существующий диалог/ }).click()
    await page.getByRole('article').filter({ hasText: 'Сообщение до входа' }).waitFor()
    assert.equal(await page.getByRole('article').count(), 2)
    await page.getByText('Загрузка сообщений…', { exact: true }).waitFor({ state: 'hidden' })
    assert.equal(
        await page.getByTestId('message-date').count(),
        1,
        'Сообщения одного дня должны иметь общий разделитель даты',
    )
    const search = page.getByRole('textbox', { name: 'Поиск чатов' })
    await search.fill('тестовый БОТ')
    assert.equal(
        await page.getByRole('navigation', { name: 'Диалоги' }).getByRole('button').count(),
        1,
    )
    assert.equal(
        await page
            .getByRole('navigation', { name: 'Диалоги' })
            .getByRole('button')
            .locator('strong')
            .textContent(),
        'Тестовый бот',
    )
    await search.fill('несуществующий чат')
    await page.getByText('Чаты не найдены', { exact: true }).waitFor()
    await search.fill('79991234567')
    assert.equal(
        await page.getByRole('navigation', { name: 'Диалоги' }).getByRole('button').count(),
        1,
        'Поиск должен учитывать известные номера телефонов',
    )
    await search.fill('')
    await page.getByRole('button', { name: 'Закрыть создание чата' }).click()
}

export async function checkMobileAndLogout(page, api, origin) {
    await connectInstance(page, origin)
    await page.getByRole('button', { name: /Существующий диалог/ }).click()
    await page.getByRole('article').filter({ hasText: 'Сообщение до входа' }).waitFor()
    const composer = page.getByRole('textbox', { name: 'Текст сообщения' })
    await mkdir('.local', { recursive: true })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.screenshot({ path: '.local/chat-desktop.png' })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await page.getByRole('complementary', { name: 'Список чатов' }).isVisible(), false)
    assert.equal(await composer.isVisible(), true)
    await page.screenshot({ path: '.local/chat-mobile.png' })
    assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
    )
    await page.getByRole('button', { name: 'Назад к чатам' }).click()
    assert.equal(await composer.isVisible(), false)
    assert.equal(await page.getByRole('textbox', { name: 'Поиск чатов' }).isVisible(), true)
    await page.screenshot({ path: '.local/chat-mobile-list.png' })
    await page.getByRole('button', { name: 'Новый чат', exact: true }).click()
    await page.getByLabel('Новый чат по телефону').fill('123')
    await page.getByRole('button', { name: 'Открыть', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'международном формате' }).waitFor()
    await page.getByRole('button', { name: 'Закрыть создание чата' }).click()
    await page.getByRole('button', { name: /Существующий диалог/ }).click()
    assert.equal(await composer.isVisible(), true)
    await page.getByRole('button', { name: 'Назад к чатам' }).click()
    await page.getByRole('button', { name: 'Выйти' }).click()
    await page.getByRole('button', { name: 'Подключиться' }).waitFor()
    const countAtExit = api.receives
    await page.waitForTimeout(800)
    assert.equal(
        api.receives,
        countAtExit,
        'Получение уведомлений должно остановиться после выхода',
    )
}
