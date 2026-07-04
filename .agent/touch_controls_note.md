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
