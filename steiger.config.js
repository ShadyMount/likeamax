import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
    ...fsd.configs.recommended,
    {
        // В одностраничном клиенте модель и два крупных блока UI намеренно разделены.
        // Число использований — подсказка; проверки границ слоёв и публичных API включены.
        rules: { 'fsd/insignificant-slice': 'off' },
    },
])
