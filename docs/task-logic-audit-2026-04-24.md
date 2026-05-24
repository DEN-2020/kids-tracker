# Task Logic Audit 2026-04-24

## Scope

Проверены:

- создание и редактирование задач в админке
- `duration` / таймер
- `isAutoRepeat`
- `isAutoApprove`
- `isAutoPayout`
- approval/direct-complete flow
- различия между client fallback и Cloud Functions
- куда лучше добавить мини-иконки на карточки задач

## Current Behavior

### Task Config

- Форма админки всегда сохраняет задачу на текущего `selectedChildId`.
- UI для явного `assignedTo = 'all'` сейчас нет.
- `duration` сохраняется в минутах.
- `isAutoRepeat`, `isAutoApprove`, `isAutoPayout` сохраняются и доходят до backend.

### Timer

- Есть два разных “таймера”, и это сейчас путает модель.
- На обычной карточке задачи показывается не `duration`, а дедлайн до `21:00` текущего дня.
- Реальный `duration` используется только в блоке `in_progress`.
- `runningTimer` живёт только в локальном React state, не пишется в базу и пропадает после refresh.
- Окончание таймера ничего не делает с задачей само по себе.

### Repeat / Completion

- В Functions-режиме repeat-задача остаётся и получает `lastCompleted` / `lastCompletedAt`.
- В Functions-режиме non-repeat задача удаляется после completion.
- В fallback-режиме задача не удаляется, а только получает `lastCompleted*`.
- Из-за этого локальный режим и production сейчас ведут себя по-разному.

### Auto Approve

- По текущему runtime `autoApprove` фактически значит: завершить задачу сразу, без pending/in-progress approval.
- При этом старый helper всё ещё кодирует альтернативную модель: `autoApprove => in_progress`.
- Это логическое расхождение уже есть прямо в коде.

### Auto Payout

- `isAutoPayout` сейчас флаг-пустышка.
- Он сохраняется, но не меняет поведение ни на клиенте, ни в Functions.

## Findings

### P0

- Cloud Functions сейчас доверяют клиенту слишком много.
- `submitApproval` позволяет создать произвольную approval с произвольными `points/status`, не сверяя это с реальной задачей.
- `settleApproval` позволяет ребёнку закрыть свою `in_progress` approval и получить баллы.
- `completeTaskDirect` берёт `points` из payload и не проверяет `assignedTo`.
- В таком виде server-path надо ужесточить первым делом.

### P1

- `duration` почти не участвует в реальном user-flow.
- UI почти не создаёт устойчивый `in_progress` сценарий, а таймер привязан именно к нему.
- На карточке одновременно есть отдельный “до 21:00” дедлайн, который вообще не связан с `duration`.
- `autoApprove` сейчас по факту не “auto approve”, а “instant complete”.

### P1

- `repeat/non-repeat` расходится между fallback и Functions.
- Это значит, что логика зависит от env-флага, а не от бизнес-правил.

### P1

- Кнопка “copy” в шаблонах работает как edit existing.
- Из-за этого общую задачу или задачу другого ребёнка можно случайно перезаписать и перепривязать к текущему ребёнку.

### P2

- `clearOldTasks` называется неточно.
- Сейчас это массовое удаление всех non-repeat задач выбранного ребёнка и общих задач, а не очистка “старых”.

### P2

- Прогресс “за день” считается по текущему `tasks_list`.
- После удаления одноразовой задачи в Functions-режиме дневной прогресс может выглядеть заниженным.

## Timer Semantics: What It Actually Means Now

Сейчас `duration` означает только одно:

- если задача уже находится в `in_progress`, можно локально включить обратный отсчёт на `duration` минут

Сейчас `duration` НЕ означает:

- дедлайн до конца дня
- автоматическое завершение задачи
- блокировку завершения до истечения времени
- сохранённый таймер между refresh / устройствами

Отдельный бейдж `⏱️ Xч Yм` на карточке означает:

- время до `21:00` текущего дня

То есть сейчас в UI смешаны две разные концепции времени:

- `duration` задачи
- дневной deadline до `21:00`

## UI Improvement Plan

### Mini-Icons On Task Cards

Лучшее место:

- `top-left` на `TaskItem`

Иконки:

- `⏱` если есть `duration`
- `🔄` если `isAutoRepeat`
- `⚡` если `isAutoApprove`
- `💰` если `isAutoPayout`

Отдельно для `in_progress` карточек:

- либо inline-ряд рядом с названием
- либо отдельный `top-left`, если сделать `.activeTaskCard` позиционируемой

## Recommended Canonical Model

Нужно выбрать одну модель и дальше выровнять под неё весь код.

Рекомендуемый вариант:

- `isAutoRepeat`: задача не удаляется, а сбрасывается по дню
- `isAutoApprove`: задача сразу переводится в `in_progress`, без parent approval
- `duration`: обязательное минимальное время до `Done`, если задача требует таймер
- `isAutoPayout`: после выполнения и прохождения условий награда начисляется без ручного parent action
- non-repeat without repeat: удалять после completion или архивировать, но одинаково в любом режиме

## Execution Plan

### Step 1

Закрыть P0 в Functions:

- `submitApproval` должен работать только от реальной задачи
- points/label/icon должны браться с сервера из task
- child не должен уметь создать себе произвольную `in_progress`
- `completeTaskDirect` должен проверять `assignedTo`

### Step 2

Выбрать каноническую семантику для:

- `duration`
- `autoApprove`
- `autoPayout`
- repeat vs non-repeat

### Step 3

Выровнять fallback и Functions, либо максимально убрать fallback для task mutations.

### Step 4

Починить admin UX:

- настоящий copy-as-new
- явная модель для `assignedTo = all`
- переименовать / переписать `clearOldTasks`

### Step 5

Добавить мини-иконки на карточки и привести тексты/лейблы к понятной терминологии.

## Suggested Order For The Next Work Session

1. Server safety fixes for `submitApproval` / `settleApproval` / `completeTaskDirect`
2. Unified business rules for timer / auto-approve / auto-payout
3. Align fallback with Functions
4. Admin form + copy flow cleanup
5. Task card badges and timer UX cleanup
