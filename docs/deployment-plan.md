# План выхода в реальный веб

## Статус на 2026-07-04

Постоянный публичный стенд поднят как один Cloudflare Worker:

- Vite-клиент временно встроен в Worker module как embedded HTML/CSS/JS;
- realtime-комнаты работают через Workers + Durable Objects;
- клиент в production подключается к `/ws` на том же домене;
- публичный URL: `https://astro-game-worker.stakkkkk.workers.dev/`;
- smoke по удаленному `wss://astro-game-worker.stakkkkk.workers.dev/ws` прошел.

Этот стенд опубликован через Cloudflare API plugin без `wrangler login`. Ограничение текущего API-пути: Workers Static Assets upload требует отдельный upload JWT на `api.workers.cloudflare.com`, а plugin разрешает не все прямые fetch-запросы, поэтому для постоянного стенда применен embedded-assets fallback. После нормальной авторизации Cloudflare предпочтительный путь остается `npm run deploy:worker`, чтобы вернуть штатные Workers Static Assets.

## Цель

Сделать игру доступной не только локально, а по публичной ссылке, чтобы два игрока с разных устройств могли подключиться к одной комнате и увидеть общий мир.

## Рекомендуемый путь

Текущий рабочий вариант: Cloudflare Workers Static Assets для Vite-клиента и Cloudflare Workers + Durable Objects для WebSocket-комнат в одном Worker.

Альтернатива после авторизации Cloudflare: Cloudflare Pages для Vite-клиента и отдельный Cloudflare Worker для WebSocket-комнат. Pages deploy из текущей non-interactive среды потребовал `CLOUDFLARE_API_TOKEN`, поэтому для быстрого публичного результата выбран единый Worker.

Почему так:

- клиент уже статический Vite-проект;
- комнаты игры естественно ложатся на Durable Object: один объект на roomId;
- Cloudflare официально описывает Durable Objects как механизм для координации нескольких клиентов, включая multiplayer и realtime;
- Cloudflare Pages умеет GitHub-интеграцию и автодеплой при push;
- WebSocket Hibernation у Durable Objects снижает стоимость долгих WebSocket-соединений.

## План по этапам

### Этап 1. Подготовить клиент к публичному серверу

- Добавить переменную окружения для WebSocket URL.
- В dev оставить `ws://localhost:8787`.
- В production использовать `wss://...` адрес Worker.
- Проверка: production build открывается локально и подключается к указанному WebSocket URL.

### Этап 2. Выделить game core из Node-сервера

- Вынести чистую логику комнаты из `apps/server/src/index.ts`.
- Оставить Node-сервер как локальный adapter.
- Подготовить Cloudflare Worker adapter отдельно.
- Проверка: `npm.cmd run smoke:ws` продолжает проходить на Node adapter.

### Этап 3. Добавить Cloudflare Worker + Durable Object

- Создать `apps/worker`.
- Добавить `wrangler`.
- Описать Durable Object `GameRoom`.
- Маршрутизировать WebSocket по roomId.
- Проверка: локальный `wrangler dev` принимает два WebSocket-клиента в одну комнату.

### Этап 4. Деплой backend

- Создать Cloudflare Worker проект.
- Настроить Durable Object binding.
- Задеплоить Worker.
- Получить публичный `wss://` endpoint.
- Проверка: smoke-тест подключается к удаленному Worker.

### Этап 5. Деплой клиента

- Подключить GitHub-репозиторий к Cloudflare Pages.
- Build command: `npm.cmd run build --workspace @astro-game/client` или адаптированная команда для Cloudflare Linux окружения.
- Build output: `apps/client/dist`.
- Задать production WebSocket URL.
- Проверка: публичная Pages-ссылка открывает игру и подключается к Worker.

### Этап 6. Постоянный Cloudflare API deploy

- Создать account workers.dev subdomain `stakkkkk`.
- Загрузить Worker module через Cloudflare API plugin.
- Применить Durable Object migration `v1`.
- Включить `astro-game-worker.stakkkkk.workers.dev`.
- Проверка: `/health`, HTML и удаленный WebSocket smoke проходят.

### Этап 7. Проверка с двух устройств

- Открыть публичную ссылку на ноутбуке и телефоне.
- Подключиться к одной комнате.
- Проверить движение, цвета игроков, указатели, стрельбу, очки.
- Зафиксировать результат в README и `.agent/history.md`.

## Минимальный Definition of Done

- Есть публичная ссылка на клиент.
- Есть публичный WebSocket endpoint.
- Два устройства подключаются к одной комнате.
- Игроки видят корабли друг друга.
- Цвета игроков и указатели работают.
- Астероиды и очки синхронизируются сервером.
- В README есть инструкция локального и публичного запуска.

## Риски

- Durable Object game loop отличается от обычного Node interval и потребует adapter-слой.
- WebSocket Hibernation требует аккуратно хранить состояние подключений.
- Нельзя тащить Node-only API в Worker runtime.
- Нужно не сломать локальный Node-сервер, пока переносим backend.

## Источники

- Cloudflare Durable Objects overview: `https://developers.cloudflare.com/durable-objects/`
- Cloudflare Durable Objects WebSockets: `https://developers.cloudflare.com/durable-objects/best-practices/websockets/`
- Cloudflare WebSocket Hibernation example: `https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/`
- Cloudflare Pages Git integration: `https://developers.cloudflare.com/pages/configuration/git-integration/`
- Cloudflare Pages Vite guide: `https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/`
