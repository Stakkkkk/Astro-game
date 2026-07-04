# Контекст проекта

## Исходные вводные

- Пользователь попросил обжить проект, используя инструкции из `Stakkkkk/agent-start`.
- Пользователь уточнил, что проект нужно вести как кейс «не ИТшник создает игру», чтобы позже сделать методические пособия для коллег без фантазии.
- Пользователь указал GitHub-репозиторий `https://github.com/Stakkkkk/Astro-game` и отдельно попросил, чтобы агентская обвязка тоже шла в git.
- Пользователь надиктовал концепт в ChatGPT из-за проблем с микрофоном ноутбука, получил Markdown и положил его во входящие артефакты проекта.
- Пользователь уточнил игровой режим: задний ход отключить, оставить ракетную тягу вперед и добавить небольшой огонь из двигателя при движении вперед.
- Пользователь попросил описать трех субагентов отдельными файлами правил и упомянуть их в основном `AGENTS.md`.
- Пользователь попросил добавить цветные указатели на других игроков у края экрана, сделать каждому игроку отдельный цвет и перейти к плану реального веб-деплоя.
- Пользователь уточнил, что астероиды должны появляться извне и прилетать к игрокам, потому что при стартовой раздаче можно улететь от поля или уничтожить всё.
- Рабочий каталог на момент обживания: `C:\PetProjects\Astro-game`.
- Каталог на момент проверки был пустым и не являлся git-репозиторием.
- Для правил выбран русский язык, потому что пользовательские глобальные правила требуют отвечать на русском языке.

## Источники

- `https://github.com/Stakkkkk/agent-start`
- `https://raw.githubusercontent.com/Stakkkkk/agent-start/main/instructions/agent-start.ru.md`
- `https://raw.githubusercontent.com/Stakkkkk/agent-start/main/instructions/agent-start.en.md`
- `https://github.com/Stakkkkk/agent-io-safety-kit`

## Допущения

- `C:\PetProjects\Astro-game` является целевым корнем проекта, потому что он совпал с текущим рабочим каталогом Codex и пользователь не указал другой путь.
- В проекте не было существующих правил агента, поэтому создан корневой `AGENTS.md` как стандартная точка входа для Codex и совместимых агентов.
- `.agent/` используется как локальная служебная память, чтобы не складывать историю, контекст и score в корень проекта.
- `.agent-io-safety/` оставлен в корне как управляемая копия safety-kit, потому что это часть механизма самого kit.

## Решения

- Создать `AGENTS.md` и сохранить в нем рабочие правила проекта, правила коммуникации, правила схем, контекст/историю/score и управляемый блок `agent-io-safety-kit`.
- Развернуть `agent-io-safety-kit` с языком `ru`, так как проектные правила и коммуникация ведутся на русском.
- Создать `.agent/history.md` для передачи контекста человеку или следующему агенту.
- Создать `.agent/case_non_it_game.md` как отдельное описание кейса, не смешивая его с технической историей изменений.
- Создать `.agent/agent_score.md` с нейтральным значением `50`.
- После уточнения пользователя убрать игнорирование `.agent/`: агентская память и обвязка должны версионироваться вместе с проектом.
- Инициализировать git в `C:\PetProjects\Astro-game`, использовать ветку `main` и remote `origin` на `https://github.com/Stakkkkk/Astro-game.git`.
- Принять исходный концепт из `artefacts/in/online_asteroids_training_project.md` как сырой источник требований.
- Для первого MVP выбрать Web + TypeScript + Node.js WebSocket server + Canvas 2D, а Cloudflare/Durable Objects оставить как следующий деплойный этап после работающего локального slice.
- Использовать npm workspaces вместо pnpm, потому что `pnpm` на машине не установлен, а npm уже доступен через `npm.cmd`.
- В игровой модели убрать задний ход: корабль работает в ракетном режиме с тягой только вперед.
- Субагентские правила хранить в `.agent/subagents/`; актуализатор плана запускается после проработки вопросов по плану, архитектор-ревьюер только по явному запросу, тестировщик после правок.
- Цвет игрока назначает сервер при входе в комнату; клиент использует этот цвет для корабля, scoreboard и стрелки-указателя.
- Мир сделан условно бесконечным через большой тороидальный размер и поток астероидов вокруг активных игроков.
- Целевой публичный деплой уточнен: первый рабочий публичный путь — единый Cloudflare Worker со Static Assets для Vite-клиента и Durable Objects для WebSocket-комнат; Cloudflare Pages остается альтернативой после постоянной авторизации.
- Game core вынесен в `packages/game-core`, Node.js сервер стал локальным adapter, Cloudflare Worker стал production adapter.
- Временный Cloudflare preview опубликован командой `wrangler deploy --temporary`: `https://astro-game-worker.spangle-roarer.workers.dev/`.
- Wrangler `whoami` показал отсутствие постоянной авторизации; для постоянного деплоя нужен `wrangler login` или `CLOUDFLARE_API_TOKEN`.

## Текущее состояние

- Проектный корень: `C:\PetProjects\Astro-game`.
- GitHub-репозиторий: `https://github.com/Stakkkkk/Astro-game`.
- Основная ветка: `main`, отслеживает `origin/main`.
- Первый опубликованный коммит: `5c08cbc` (`Initialize agent workspace`).
- Актуальный опубликованный коммит проверяй через `git log --oneline --decorate -1` и `git ls-remote --heads origin main`.
- Основной файл правил: `C:\PetProjects\Astro-game\AGENTS.md`.
- Safety-kit: `C:\PetProjects\Astro-game\.agent-io-safety`.
- История: `C:\PetProjects\Astro-game\.agent\history.md`.
- Кейс: `C:\PetProjects\Astro-game\.agent\case_non_it_game.md`.
- Заметка к кейсу про публичный веб: `C:\PetProjects\Astro-game\.agent\case_public_web_note.md`.
- Контекст: `C:\PetProjects\Astro-game\.agent\context.md`.
- Adaptive score: `C:\PetProjects\Astro-game\.agent\agent_score.md`.
- Правила субагентов: `C:\PetProjects\Astro-game\.agent\subagents`.
- Сырой концепт: `C:\PetProjects\Astro-game\artefacts\in\online_asteroids_training_project.md`.
- Документация продукта: `C:\PetProjects\Astro-game\README.md`, `C:\PetProjects\Astro-game\docs`.
- Первый рабочий стек: npm workspaces, TypeScript, Vite, Canvas 2D, Node.js, `ws`.
- Проверки MVP: `npm.cmd run check`, `npm.cmd run build`, `npm.cmd run smoke:ws`.
- Локальный dev-сервер сейчас рассчитан на клиент `http://localhost:5174` и WebSocket `ws://localhost:8787`.
- План реального веба: `C:\PetProjects\Astro-game\docs\deployment-plan.md`.
- Публичный preview: `https://astro-game-worker.spangle-roarer.workers.dev/`.
- Production WebSocket в preview: `wss://astro-game-worker.spangle-roarer.workers.dev/ws`.
- Новые проверки деплоя: `npm.cmd run smoke:worker` и удаленный smoke через `SMOKE_WS_URL=wss://astro-game-worker.spangle-roarer.workers.dev/ws`.
