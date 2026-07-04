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
| Ускорение | `W` или `ArrowUp` |
| Торможение | `S` или `ArrowDown` |
| Выстрел | `Space` |
| Debug overlay | `P` или `F3` |

## Структура

```text
apps/
  client/   # браузерный клиент
  server/   # авторитетный WebSocket-сервер
packages/
  shared/   # общие типы, протокол, константы и математика
docs/
  decisions/
```

## Документация

- [Концепт](docs/concept.md)
- [Архитектура](docs/architecture.md)
- [Сеть и протокол](docs/networking.md)
- [Roadmap](docs/roadmap.md)
- [ADR-001: выбор платформы](docs/decisions/ADR-001-platform-choice.md)
- [ADR-002: сетевая модель](docs/decisions/ADR-002-network-model.md)
