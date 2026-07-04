# Astro Game

Учебный проект онлайн-игры в духе Asteroids. Цель первого цикла — настоящий сетевой MVP: два браузера подключаются к одной комнате, видят общий мир, летают двумя кораблями, стреляют по общим астероидам и получают очки с авторитетного сервера.

## Текущий стек

- Web client: TypeScript + Canvas 2D + Vite.
- Server: TypeScript + Node.js + `ws`.
- Shared protocol: `packages/shared`.
- Package manager: npm workspaces, потому что npm уже идет вместе с Node.js и не требует отдельной установки.

## Быстрый старт

```bash
npm install
npm run dev
```

После запуска:

- клиент: `http://localhost:5174`;
- WebSocket-сервер: `ws://localhost:8787`.

Полезные проверки:

```bash
npm run check
npm run build
npm run smoke:ws
npm run smoke:worker
```

Проверка MVP:

1. Открой `http://localhost:5174` в двух вкладках.
2. Введи разные ники.
3. Подключись к одной комнате, например `default`.
4. Убедись, что движение одного корабля видно во второй вкладке.
5. Постреляй по общим астероидам и проверь очки в таблице.

## Управление

| Действие | Клавиша |
| --- | --- |
| Поворот влево | `A` или `ArrowLeft` |
| Поворот вправо | `D` или `ArrowRight` |
| Ракетная тяга вперёд | `W` или `ArrowUp` |
| Выстрел | `Space` |
| Debug overlay | `P` или `F3` |

На тачскрине после входа в комнату появляется левый виртуальный стик и правая кнопка выстрела. Стик задает направление, куда корабль должен повернуть, а сильное отклонение от центра включает тягу.

## Структура

```text
apps/
  client/   # браузерный клиент
  server/   # локальный Node.js WebSocket-adapter
  worker/   # Cloudflare Worker + Durable Object + static assets
packages/
  game-core/ # общая серверная логика комнаты
  shared/   # общие типы, протокол, константы и математика
docs/
  decisions/
```

## Публичный запуск

Текущий публичный preview развернут как единый Cloudflare Worker со Static Assets и Durable Object комнатами:

- сайт: `https://astro-game-worker.spangle-roarer.workers.dev/`;
- health endpoint: `https://astro-game-worker.spangle-roarer.workers.dev/health`;
- WebSocket endpoint: `wss://astro-game-worker.spangle-roarer.workers.dev/ws`.

Preview создан через временный аккаунт Wrangler (`wrangler deploy --temporary`) и живет как проверочный публичный стенд. Для постоянного деплоя нужно выполнить `wrangler login` или передать `CLOUDFLARE_API_TOKEN`, затем запустить:

```bash
npm run build
npm run deploy:worker
```

Cloudflare Pages остается возможным вариантом для отдельного статического клиента, но текущий рабочий путь проще: Worker отдает и клиент, и `/ws` с одного домена.

## Документация

- [Концепт](docs/concept.md)
- [Архитектура](docs/architecture.md)
- [Сеть и протокол](docs/networking.md)
- [Roadmap](docs/roadmap.md)
- [План выхода в реальный веб](docs/deployment-plan.md)
- [ADR-001: выбор платформы](docs/decisions/ADR-001-platform-choice.md)
- [ADR-002: сетевая модель](docs/decisions/ADR-002-network-model.md)
- [ADR-003: публичный веб-деплой](docs/decisions/ADR-003-public-web-deployment.md)
