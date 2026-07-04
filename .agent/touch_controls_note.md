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
- Обычный `/` на preview вернул новый HTML с `/assets/index-D3haDGmw.js` и `/assets/index-T_jwM9eI.css`, заголовок `Cache-Control: no-store, max-age=0`.
- `https://astro-game-worker.spangle-roarer.workers.dev/health` вернул `ok`.
- Удаленный smoke через `SMOKE_WS_URL=wss://astro-game-worker.spangle-roarer.workers.dev/ws` прошел со второй попытки; первая попытка сразу после deploy поймала timeout на прогреве.
- `npm.cmd run smoke:worker`
- `npx.cmd wrangler deploy --config apps/worker/wrangler.jsonc --temporary`
- удаленный smoke через `SMOKE_WS_URL=wss://astro-game-worker.spangle-roarer.workers.dev/ws`

## Обновление 2026-07-04 14:17:09 +07:00

- По повторному скриншоту выяснилось, что предыдущая правка масштаба была сделана в неверную сторону: mobile world zoom `1.35` раздувал корабли, астероиды и сетку.
- Для touch-экранов камера теперь отъезжает: `0.68` в landscape и `0.82` в portrait, чтобы на телефоне было видно больше пространства.
- Добавлены приборы полета: скорость и курс/компас.
- Убрана лишняя перерисовка HUD на каждом animation frame; HUD и debug обновляются только при изменении/с периодическим throttle.
- Для рендера добавлено легкое client-side extrapolation по velocity и сглаживание камеры, чтобы движение не дергалось строго по серверным тикам.
- Статус подключения разделен на информационный и ошибочный; старый сокет при новом подключении отвязывается до `close`, чтобы не мигать ложной ошибкой.
- На touch-устройствах отключен тяжелый `backdrop-filter` у игровых overlay, чтобы снизить лаги в мобильном браузере.
- Worker теперь отдает HTML с `Cache-Control: no-store` и внутренним cache-buster для static assets, потому что обычный `/` после deploy мог возвращать старый `index.html`.

Проверки:

- `npm.cmd run check`
- `npm.cmd run build`
- `npm.cmd run smoke:ws`

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
