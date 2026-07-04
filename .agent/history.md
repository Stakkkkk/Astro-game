# История изменений

## 2026-07-04 11:11:20 +07:00

### Что изменено

- Создан основной файл правил `AGENTS.md`.
- Развернут `agent-io-safety-kit` в `.agent-io-safety/` через официальный `scripts/deploy.mjs`.
- Создана локальная служебная память `.agent/`.
- Создан контекст проекта `.agent/context.md`.
- Создана история изменений `.agent/history.md`.
- Создан adaptive score `.agent/agent_score.md`.
- Создан `.gitignore` с игнорированием `.agent/` и типового локального шума.

### Зачем

- Выполнить обживание проекта по инструкции `Stakkkkk/agent-start`.
- Сохранить правила агента в понятной точке входа.
- Не захламлять корень проекта служебной памятью.
- Добавить safety-механизм для shell и текстового I/O.

### Затронутые файлы и каталоги

- `AGENTS.md`
- `.gitignore`
- `.agent-io-safety/`
- `.agent/context.md`
- `.agent/history.md`
- `.agent/agent_score.md`

### Проверка

- Подтвержден рабочий каталог: `C:\PetProjects\Astro-game`.
- Проверено, что каталог был пустым и не являлся git-репозиторием.
- Проверен Node.js: `v24.16.0`.
- Выполнен `node scripts/deploy.mjs --target C:\PetProjects\Astro-game --entry AGENTS.md --lang ru`.
- Выполнен `node scripts/doctor.mjs --target C:\PetProjects\Astro-game --entry AGENTS.md --lang ru --json`; все проверки вернули `ok`.
- Выполнен `node .agent-io-safety/skills/safe-text-io/scripts/inspect-text.mjs AGENTS.md .gitignore .agent/context.md .agent/history.md .agent/agent_score.md --fail-on-bom --eol lf`; все проверенные файлы UTF-8 без BOM с LF.

### Что осталось нерешенным

- В проекте пока нет продуктового кода, README, package-файлов или git-репозитория.
- Структура приложения еще не выбрана.

## 2026-07-04 11:25:45 +07:00

### Что изменено

- В `AGENTS.md` добавлен отдельный раздел `Кейс: не ИТшник создает игру`.
- Создан файл `.agent/case_non_it_game.md` для описания пользовательского кейса отдельно от технической истории.
- Обновлен `.agent/context.md`: добавлена цель вести кейс для будущих методических пособий.

### Зачем

- Зафиксировать, что проект важен не только как разработка игры, но и как наблюдаемый сценарий работы человека без ИТ-бэкграунда с агентом.
- Разделить технический changelog и методическое описание процесса.

### Затронутые файлы

- `AGENTS.md`
- `.agent/context.md`
- `.agent/history.md`
- `.agent/case_non_it_game.md`

### Проверка

- Перед правкой прочитаны `AGENTS.md`, `.agent/context.md`, `.agent/history.md`, `.agent/agent_score.md` и правила safe text I/O через `read-text.mjs`.
- Выполнен `node .agent-io-safety/skills/safe-text-io/scripts/inspect-text.mjs AGENTS.md .agent/context.md .agent/history.md .agent/case_non_it_game.md --fail-on-bom --eol lf`; все проверенные файлы UTF-8 без BOM с LF.
- Выполнен `node scripts/doctor.mjs --target C:\PetProjects\Astro-game --entry AGENTS.md --lang ru --json`; все проверки вернули `ok`.

### Что осталось нерешенным

- Нужно наполнять кейс по мере появления реальных продуктовых решений, вопросов пользователя, игровых механик и рабочих приемов.

## 2026-07-04 11:28:45 +07:00

### Что изменено

- Инициализирован локальный git-репозиторий для GitHub-репозитория `https://github.com/Stakkkkk/Astro-game`.
- Добавлен remote `origin` на `https://github.com/Stakkkkk/Astro-game.git`.
- Добавлен `.gitattributes`, чтобы git сохранял LF для текстовых файлов на Windows.
- В `.gitignore` убрано игнорирование `.agent/`, потому что пользователь явно попросил включить агентскую обвязку в git.
- Обновлен `.agent/context.md`: добавлены GitHub-репозиторий, ветка `main` и решение версионировать агентскую память.

### Зачем

- Связать локальный проект с репозиторием пользователя на GitHub.
- Сохранить не только продуктовые файлы, но и агентские правила, историю, контекст и кейс как часть проекта.

### Затронутые файлы

- `.gitignore`
- `.agent/context.md`
- `.agent/history.md`
- `.agent/case_non_it_game.md`

### Проверка

- GitHub-страница `https://github.com/Stakkkkk/Astro-game` проверена: репозиторий публичный и пустой.
- Выполнен `git ls-remote --heads https://github.com/Stakkkkk/Astro-game.git`; команда завершилась успешно и не вернула веток.
- Выполнен `git init -b main`; создан локальный репозиторий на ветке `main`.
- Выполнен `git remote add origin https://github.com/Stakkkkk/Astro-game.git`.
- Выполнен `git check-ignore -v .agent/context.md`; файл не игнорируется.
- Проверен `git`: `git version 2.52.0.windows.1`.
- Проверен `gh`: GitHub CLI не установлен, для прямого первого push в пустой репозиторий не требуется.
- Так как `git config user.name` и `git config user.email` не были заданы, локально для этого репозитория настроено `Stakkkkk <Stakkkkk@users.noreply.github.com>`.
- После первого `git add -A` git предупредил о будущей замене LF на CRLF; добавлен `.gitattributes` с `* text=auto eol=lf`.
- Выполнен `git add --renormalize .`, затем `git add -A`; повторных CRLF-предупреждений не было.
- Выполнен `git commit -m "Initialize agent workspace"`; создан root-коммит `5c08cbc`.
- Выполнен `git push -u origin main`; ветка `main` отправлена в GitHub и настроена на отслеживание `origin/main`.

### Что осталось нерешенным

- Фактический результат push зафиксирован в следующем разделе.

## 2026-07-04 11:31:36 +07:00

### Что изменено

- Обновлены `.agent/context.md` и `.agent/history.md` после успешной публикации первого коммита.

### Зачем

- Зафиксировать в агентской памяти фактический результат git-инициализации и push.

### Затронутые файлы

- `.agent/context.md`
- `.agent/history.md`

### Проверка

- `git push -u origin main` завершился успешно.
- Локальная ветка `main` настроена на отслеживание `origin/main`.

### Что осталось нерешенным

- Нет по текущей задаче после отправки финальной записи истории в `origin/main`.

## 2026-07-04 11:58:23 +07:00

### Что изменено

- Принят входящий концепт из `artefacts/in/online_asteroids_training_project.md`.
- Создана документация продукта: `README.md`, `docs/concept.md`, `docs/architecture.md`, `docs/networking.md`, `docs/roadmap.md`.
- Созданы ADR: `docs/decisions/ADR-001-platform-choice.md`, `docs/decisions/ADR-002-network-model.md`.
- Создан TypeScript monorepo на npm workspaces.
- Создан shared-пакет `packages/shared` с протоколом, типами, константами и math helpers.
- Создан WebSocket-сервер `apps/server` с авторитетным game loop, комнатами, кораблями, астероидами, снарядами, уронами и очками.
- Создан Canvas-клиент `apps/client` со стартовым экраном, управлением, HUD, scoreboard и debug overlay.
- Добавлен smoke-тест `scripts/smoke-ws.mjs`.
- В `.gitignore` добавлено `dist/`.
- Обновлен `.agent/context.md` и `.agent/case_non_it_game.md`.

### Зачем

- Превратить надиктованный концепт в работающий первый сетевой вертикальный срез.
- Не начинать с большой архитектуры, а сразу доказать цепочку: игрок → сервер → общий мир → астероиды → выстрелы → очки → второй клиент видит результат.

### Затронутые файлы и каталоги

- `artefacts/in/online_asteroids_training_project.md`
- `README.md`
- `package.json`
- `package-lock.json`
- `tsconfig.base.json`
- `scripts/`
- `apps/client/`
- `apps/server/`
- `packages/shared/`
- `docs/`
- `.gitignore`
- `.agent/context.md`
- `.agent/history.md`
- `.agent/case_non_it_game.md`

### Проверка

- Выполнен `node .agent-io-safety/skills/safe-text-io/scripts/inspect-text.mjs artefacts/in/online_asteroids_training_project.md --fail-on-bom --eol lf`; входящий Markdown UTF-8 без BOM с LF.
- Проверен `node --version`: `v24.16.0`.
- Проверен `pnpm --version`: `pnpm` не установлен.
- Проверен `npm.cmd --version`: `11.13.0`.
- Проверены актуальные версии пакетов через `npm.cmd view`: Vite `8.1.3`, TypeScript `6.0.3`, `ws` `8.21.0`, `tsx` `4.23.0`, `@types/ws` `8.18.1`, `@types/node` `26.1.0`.
- Выполнен `npm.cmd install`; установлено 26 пакетов, уязвимости не найдены.
- Первый `npm.cmd run check` выявил nullable DOM-ошибки в клиенте; исправлено через `mustQuery` и явный `ctx`.
- Выполнен `npm.cmd run check`; все workspace прошли TypeScript-проверку.
- Выполнен `npm.cmd run build`; клиент собран Vite, сервер и shared прошли `tsc --noEmit`.
- Первый `npm.cmd run smoke:ws` выявил Windows `spawn EINVAL` при запуске `npm.cmd` из Node; smoke-тест переписан на прямой запуск `tsx`.
- Выполнен `npm.cmd run smoke:ws`; тест подключил двух клиентов к одной комнате и получил общий snapshot.
- После добавления движения астероидов повторно выполнены `npm.cmd run check`, `npm.cmd run build`, `npm.cmd run smoke:ws`; все проверки прошли.
- Первый запуск `npm.cmd run dev` упал с Windows `spawn EINVAL` из-за запуска `npm.cmd` из `scripts/dev.mjs`; dev-скрипт переписан на прямой запуск `tsx` и `vite`.
- Обнаружено, что `localhost:5173` занят старым `python -m http.server 5173 --bind 127.0.0.1`; клиентский dev-порт закреплен на `5174`, чтобы не трогать чужой процесс.
- Dev-сервер запущен: клиент `http://localhost:5174`, сервер `http://localhost:8787`, WebSocket `ws://localhost:8787`.
- Проверено `Invoke-WebRequest http://localhost:8787`: сервер вернул JSON со статусом `ok`.
- Проверено `Invoke-WebRequest http://localhost:5174`: Vite отдает HTML клиента Astro Game.
- После фиксации порта `5174` повторно выполнены `npm.cmd run check`, `npm.cmd run build`, `npm.cmd run smoke:ws`; все проверки прошли.
- Выполнен `inspect-text.mjs` для ключевых новых и измененных файлов, включая `package-lock.json`, README, scripts, client/server source и агентскую память; все проверенные файлы UTF-8 без BOM с LF.

### Что осталось нерешенным

- Коммит и push результата зафиксированы в следующем разделе.

## 2026-07-04 12:15:53 +07:00

### Что изменено

- Создан и отправлен в GitHub коммит `2ce117a` с первым онлайн Asteroids slice.

### Зачем

- Сохранить рабочий MVP и документацию в `origin/main`.

### Затронутые файлы

- `.agent/context.md`
- `.agent/history.md`

### Проверка

- Выполнен `git commit -m "Build first online Asteroids slice"`; создан коммит `2ce117a`.
- Выполнен `git push`; ветка `main` отправлена в `origin/main`.

### Что осталось нерешенным

- Нет по текущей задаче после отправки этой записи в `origin/main`.

## 2026-07-04 12:23:01 +07:00

### Что изменено

- Убран задний ход из игрового input-протокола, клиента, сервера, smoke-теста и README.
- Добавлено поле `thrusting` в `PlayerState`, чтобы серверный snapshot показывал, когда корабль использует тягу.
- В Canvas-клиент добавлена анимация небольшого огня из двигателя при движении вперед.
- Добавлены правила субагентов в `.agent/subagents/`.
- В `AGENTS.md` добавлен раздел `Субагенты`.
- Обновлен `.agent/agent_score.md`: score увеличен с `50` до `70`.
- Обновлены `.agent/context.md`, `.agent/history.md`, `.agent/case_non_it_game.md`.

### Зачем

- Привести управление к ракетной модели без заднего хода.
- Сделать движение вперед визуально понятным через факел двигателя.
- Зафиксировать процессные роли субагентов: актуализатор плана, архитектор-ревьюер, тестировщик.
- Отразить пользовательскую оценку `+20` в adaptive score.

### Затронутые файлы

- `AGENTS.md`
- `README.md`
- `apps/client/src/main.ts`
- `apps/server/src/index.ts`
- `packages/shared/src/constants.ts`
- `packages/shared/src/protocol.ts`
- `packages/shared/src/types.ts`
- `scripts/smoke-ws.mjs`
- `.agent/agent_score.md`
- `.agent/context.md`
- `.agent/history.md`
- `.agent/case_non_it_game.md`
- `.agent/subagents/plan-updater.md`
- `.agent/subagents/architect-reviewer.md`
- `.agent/subagents/tester.md`
- `.agent/subagents/architect-reviewer-log.md`

### Проверка

- Поиск по `reverse`, `SHIP_REVERSE`, `Торможение`, `ArrowDown`, `KeyS` в `apps`, `packages`, `README.md`, `docs`, `scripts` не нашел оставшихся упоминаний.
- После HMR клиент начал отправлять input без `reverse`, а уже запущенный сервер оставался старым процессом и ожидал поле `reverse`; из-за этого управление в браузере стало неработоспособным.
- `scripts/dev.mjs` исправлен: сервер теперь запускается через `tsx watch apps/server/src/index.ts`, чтобы backend перезапускался при изменении протокола и серверного кода.
- Старые Node-процессы проекта остановлены, dev-сервер поднят заново.
- Проверено, что сервер отвечает на `http://localhost:8787`, клиент отдается на `http://localhost:5174`, а серверный процесс запущен в watch-режиме.
- Тестировщик выполнен основным агентом по правилам `.agent/subagents/tester.md`, потому что отдельный runtime-субагент не запускался.
- Выполнен `npm.cmd run check`; все workspace прошли TypeScript-проверку.
- Выполнен `npm.cmd run build`; клиент собран Vite, сервер и shared прошли `tsc --noEmit`.
- Выполнен `npm.cmd run smoke:ws`; тест подключил двух клиентов к одной комнате и получил общий snapshot.
- Выполнен `inspect-text.mjs` по измененным текстовым файлам; все проверенные файлы UTF-8 без BOM с LF.

### Что осталось нерешенным

- Нужно закоммитить и отправить изменения в `origin/main`.
