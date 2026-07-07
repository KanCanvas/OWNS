# OWNpizza

`Next.js + Express + PostgreSQL + Prisma`.

---

## Один раз при первой настройке

1. Установи зависимости (Node-пакеты):
   ```bash
   npm install
   ```
2. Установи и запусти **Docker Desktop** (нужен один раз — потом он сам будет запускаться при включении Mac).
3. Проверь, что в корне проекта есть файл `.env` со строкой:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ownpizza?schema=public"
   ```
   Если файла нет — скопируй его из `.env.example`.
4. Создай таблицы в БД и заполни тестовыми пиццами:
   ```bash
   npm run db:up        # поднимает Postgres в Docker
   npm run db:push      # создаёт таблицы по prisma/schema.prisma
   npm run prisma:seed  # добавляет начальные пиццы
   ```

---

## Каждый день при открытии проекта

Перед работой убедись, что **Docker Desktop запущен** (иконка-кит в верхней панели Mac). Затем одна команда:

```bash
npm run dev:full
```

Что она делает:
1. `docker compose up -d` — поднимает Postgres (если уже поднят — ничего не сломает).
2. `prisma db push` — синхронизирует схему БД (если ты менял `schema.prisma`).
3. `nodemon server.js` — запускает сам сайт на http://localhost:3000.

Если БД и схема уже актуальны и хочется быстрее — можно просто:

```bash
npm run db:up   # один раз за сессию
npm run dev     # каждый раз
```

---

## Полезные команды

| Что хочу сделать                              | Команда                  |
|-----------------------------------------------|--------------------------|
| Поднять базу                                  | `npm run db:up`          |
| Остановить базу                               | `npm run db:down`        |
| Посмотреть логи Postgres                      | `npm run db:logs`        |
| Применить изменения `schema.prisma` к БД      | `npm run db:push`        |
| Сбросить БД и засеять заново                  | `npm run db:reset`       |
| Открыть GUI для просмотра/редактирования БД   | `npm run prisma:studio`  |
| Запустить сайт                                | `npm run dev`            |
| Поднять БД + схема + сайт одной командой      | `npm run dev:full`       |

---

## Когда что вызывать

- **Поменял модель в `prisma/schema.prisma`** → `npm run db:push` (быстро, без миграций) или `npm run prisma:migrate -- --name <имя>` (с миграциями для прода).
- **Хочешь посмотреть таблицы и записи глазами** → `npm run prisma:studio` → откроется http://localhost:5555.
- **Что-то совсем сломалось в БД** → `npm run db:reset` (удалит все данные и пересоздаст с нуля).

---

## Что важно понимать

- **Postgres крутится в Docker**. Без запущенного Docker Desktop сайт не сможет сохранять заказы и пиццы — будет ошибка «Не удаётся подключиться к PostgreSQL».
- **Prisma — это ORM** (мост между JS-кодом и SQL). Запускать «Призму» отдельно не нужно: она работает внутри `server.js` через `lib/prisma.js`. Команды `npm run db:push`, `npm run prisma:studio` и т.п. — это утилиты для работы со схемой/данными.
- **`.env`** не коммитится в git (он в `.gitignore`). Если кто-то клонирует проект — он копирует `.env.example` в `.env`.

## Структура

- `prisma/schema.prisma` — описание таблиц (Pizza, Order, …).
- `prisma/seed.js` — начальные данные.
- `lib/prisma.js` — singleton Prisma Client, используется во всех частях сервера.
- `server.js` — Express + Next.js, эндпоинты `/api/pizzas`, `/order`, …
- `components/BasketModal.jsx` — корзина с кнопками оплаты и `POST /order`.
