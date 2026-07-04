# ADR-003: путь к публичному веб-деплою

## Статус

Принято и частично реализовано.

## Контекст

Локальный MVP уже работает на Vite client + Node.js WebSocket server. Пользователь хочет перейти от локального запуска к реальному вебу с публичной ссылкой.

## Рассмотренные варианты

### Cloudflare Pages + Workers + Durable Objects

Плюсы:

- подходит для статического Vite-клиента;
- Durable Objects хорошо соответствуют модели игровых комнат;
- есть GitHub-интеграция и автодеплой;
- можно сделать `wss://` endpoint без отдельного VPS.

Минусы:

- нужно адаптировать game loop под Worker runtime;
- нельзя использовать Node-only API;
- WebSocket hibernation потребует аккуратной модели подключений.

### VPS / Node.js hosting

Плюсы:

- текущий сервер почти готов к деплою;
- меньше переписывания backend-кода;
- проще мыслить обычным process + interval.

Минусы:

- больше ручной эксплуатации;
- нужно думать о process manager, TLS, domain, firewall, logs;
- хуже подходит для методического сценария «дать ссылку без инфраструктурной боли».

## Решение

Двигаться к Cloudflare Workers + Durable Objects как production runtime для realtime-комнат.

Для первого публичного результата использовать единый Cloudflare Worker:

- Workers Static Assets отдает Vite-клиент;
- Durable Object `GameRoom` держит состояние комнаты;
- `/ws` маршрутизируется в Durable Object по `roomId`;
- клиент в production использует same-origin fallback `/ws`.

Cloudflare Pages остается альтернативой для отдельного клиентского деплоя после настройки постоянной авторизации Cloudflare.

## Последствия

- Локальный Node-сервер остается как учебный и тестовый adapter.
- Worker/Durable Object становится production adapter.
- Game core вынесен в `packages/game-core`, чтобы Node adapter и Worker adapter использовали одну игровую логику.
- Для постоянного деплоя нужен `wrangler login` или `CLOUDFLARE_API_TOKEN`; временный preview уже проверен через удаленный WebSocket smoke.
