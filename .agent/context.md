# Контекст проекта

## Исходные вводные

- Пользователь попросил обжить проект, используя инструкции из `Stakkkkk/agent-start`.
- Пользователь уточнил, что проект нужно вести как кейс «не ИТшник создает игру», чтобы позже сделать методические пособия для коллег без фантазии.
- Пользователь указал GitHub-репозиторий `https://github.com/Stakkkkk/Astro-game` и отдельно попросил, чтобы агентская обвязка тоже шла в git.
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

## Текущее состояние

- Проектный корень: `C:\PetProjects\Astro-game`.
- GitHub-репозиторий: `https://github.com/Stakkkkk/Astro-game`.
- Основная ветка: `main`, отслеживает `origin/main`.
- Первый опубликованный коммит: `5c08cbc` (`Initialize agent workspace`).
- Основной файл правил: `C:\PetProjects\Astro-game\AGENTS.md`.
- Safety-kit: `C:\PetProjects\Astro-game\.agent-io-safety`.
- История: `C:\PetProjects\Astro-game\.agent\history.md`.
- Кейс: `C:\PetProjects\Astro-game\.agent\case_non_it_game.md`.
- Контекст: `C:\PetProjects\Astro-game\.agent\context.md`.
- Adaptive score: `C:\PetProjects\Astro-game\.agent\agent_score.md`.
