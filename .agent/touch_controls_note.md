# Заметка: тач-управление

Дата: `2026-07-04 13:46:18 +07:00`.

## Что изменено

- В клиент добавлен мобильный overlay управления.
- Слева после входа в комнату появляется виртуальный джойстик.
- Справа появляется круглая кнопка выстрела.
- Keyboard input и touch input объединяются в общий `PlayerInput`, поэтому WASD + `Space` остаются рабочими.
- Debug overlay скрывается на touch/coarse устройствах, чтобы не перекрывать кнопку стрельбы.
- Публичный Cloudflare preview перезалит после сборки клиента.

## Проверка

- `npm.cmd run check` прошел.
- `npm.cmd run build` прошел.
- `npm.cmd run smoke:ws` прошел.
- `npm.cmd run smoke:worker` прошел.
- `npx.cmd wrangler deploy --config apps/worker/wrangler.jsonc --temporary` обновил preview.
- `https://astro-game-worker.spangle-roarer.workers.dev/health` вернул статус `ok`.
- Удаленный smoke через `SMOKE_WS_URL=wss://astro-game-worker.spangle-roarer.workers.dev/ws` прошел.

## Что осталось проверить руками

- Открыть `https://astro-game-worker.spangle-roarer.workers.dev/` с телефона.
- Войти в комнату.
- Проверить, что левый стик поворачивает корабль и включает тягу при движении вверх.
- Проверить, что правая кнопка стреляет и не конфликтует со стиком при одновременном удержании.

## Обновление 2026-07-04 13:56:21 +07:00

- Исправлена ложная ошибка подключения: WebSocket handlers теперь игнорируют события от устаревших сокетов.
- Джойстик переделан в курсовое управление: угол отклонения задает направление, куда корабль должен довернуть.
- Тяга теперь включается по силе отклонения от центра, а не только при движении стика вверх.
- Перед отправкой каждого input клиент пересчитывает touch steering по текущему углу корабля из snapshot.
- Preview обновлен: публичный HTML ссылается на `/assets/index-DDItYDO6.js`.

Проверки:

- `npm.cmd run check`
- `npm.cmd run build`
- `npm.cmd run smoke:ws`
- `npm.cmd run smoke:worker`
- `npx.cmd wrangler deploy --config apps/worker/wrangler.jsonc --temporary`
- удаленный smoke через `SMOKE_WS_URL=wss://astro-game-worker.spangle-roarer.workers.dev/ws`

## Обновление 2026-07-04 14:05:05 +07:00

- По мобильному скриншоту исправлен масштаб телефона: для touch-экранов добавлен world zoom `1.35`.
- HUD на ширине до 640px переведен в компактную сетку, чтобы не занимать большую часть верхнего экрана.
- Touch controls на узких экранах уменьшены и подняты выше нижней системной навигации.
- Для высоты приложения добавлен `100dvh`, чтобы лучше учитывать мобильный viewport.
- Preview обновлен: публичный HTML ссылается на `/assets/index-EGZLC2QB.js` и `/assets/index-Cn8f2AaM.css`.

Проверки:

- `npm.cmd run check`
- `npm.cmd run build`
- `npm.cmd run smoke:ws`
- `npm.cmd run smoke:worker`
- `npx.cmd wrangler deploy --config apps/worker/wrangler.jsonc --temporary`
- удаленный smoke через `SMOKE_WS_URL=wss://astro-game-worker.spangle-roarer.workers.dev/ws`
