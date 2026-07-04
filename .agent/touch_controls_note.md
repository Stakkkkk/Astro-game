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
- Preview `https://astro-game-worker.glowing-newsboy.workers.dev/` вернул свежий HTML с `/assets/index-BWvgwzuW.js` и `Cache-Control: no-store, max-age=0`.
- `https://astro-game-worker.glowing-newsboy.workers.dev/health` вернул `ok`.
- Удаленный smoke через `SMOKE_WS_URL=wss://astro-game-worker.glowing-newsboy.workers.dev/ws` прошел.
- `npm.cmd run build`
- `npm.cmd run smoke:ws`
- `npm.cmd run smoke:worker`
- `npx.cmd wrangler deploy --config apps/worker/wrangler.jsonc --temporary`
- Новый temporary preview: `https://astro-game-worker.glowing-newsboy.workers.dev/`.
- Обычный `/` вернул свежий HTML с `/assets/index-CgfENCKB.js` и `Cache-Control: no-store, max-age=0`.
- `https://astro-game-worker.glowing-newsboy.workers.dev/health` вернул `ok`.
- Удаленный smoke через `SMOKE_WS_URL=wss://astro-game-worker.glowing-newsboy.workers.dev/ws` прошел после короткого прогрева deploy.
- HTML cache-buster в worker обновлен до `2026-07-04-flight-physics`.

## Обновление 2026-07-04 15:14:13 +07:00

- Пользователь подтвердил, что игра стала играбельной, но мобильные лаги остались критичными.
- Добавлено локальное visual prediction для собственного корабля: клиент сразу применяет текущий `left/right/thrust`, `SHIP_THRUST`, `SHIP_MAX_SPEED` и `wrapPosition` между серверными snapshot.
- Для чужих объектов сохранен короткий prediction cap `0.08`, для своего корабля cap увеличен до `0.2`, чтобы компенсировать задержку управления на мобильной сети.
- Мобильный canvas pixel ratio снижен до `1`, чтобы резко уменьшить число пикселей на кадр.
- На touch-устройствах количество фоновых звезд уменьшено со `110` до `56`.
- Астероиды и projectiles за пределами экрана теперь отсекаются до построения canvas path.
- HTML cache-buster в worker обновлен до `2026-07-04-mobile-lag`.

Проверки:

- `npm.cmd run check`
- `npx.cmd wrangler deploy --config apps/worker/wrangler.jsonc --temporary`
- Обычный `/` на preview вернул новый HTML с `/assets/index-D3haDGmw.js` и `/assets/index-T_jwM9eI.css`, заголовок `Cache-Control: no-store, max-age=0`.
- `https://astro-game-worker.spangle-roarer.workers.dev/health` вернул `ok`.
- Удаленный smoke через `SMOKE_WS_URL=wss://astro-game-worker.spangle-roarer.workers.dev/ws` прошел со второй попытки; первая попытка сразу после deploy поймала timeout на прогреве.

## Обновление 2026-07-04 15:06:23 +07:00

- По запросу пользователя убрано самоторможение корабля: `SHIP_DRAG` выставлен в `1`, скорость теперь сохраняется без газа до столкновения/нового импульса/лимита скорости.
- Радиус включения газа на touch-джойстике увеличен: поворот работает от малого отклонения, а тяга включается только после `0.68` силы отклонения.
- Для мобильной производительности canvas теперь ограничивает pixel ratio: на touch-устройствах максимум `1.35`, на desktop максимум `2`.
- Параметры viewport/zoom/pixel ratio кэшируются, чтобы не дергать `matchMedia` многократно во время одного рендера.
- При столкновении корабля с астероидом астероид удаляется сразу, поэтому игрок не остается внутри коллизии и не получает повторный урон каждый тик.

Проверки:

- `npm.cmd run check`
- `npm.cmd run build`
- `npm.cmd run smoke:ws`
- `npm.cmd run smoke:worker`
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
