# OWNpizza

Базовое веб-приложение пиццерии на `Next.js + Express.js + PostgreSQL + Prisma ORM`.

## Быстрый старт

1. Установи зависимости:
   - `npm install`
2. Подними PostgreSQL через Docker:
   - `docker compose up -d`
3. Проверь переменную в `.env`:
   - `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ownpizza?schema=public"`
4. Применить миграции:
   - `npm run prisma:migrate -- --name init`
5. Заполнить тестовыми данными:
   - `npm run prisma:seed`
6. Запусти приложение:
   - `npm run dev`

## Prisma команды

- `npm run prisma:generate` — генерация Prisma Client
- `npm run prisma:migrate` — миграции в dev-режиме
- `npm run prisma:studio` — GUI для БД
- `npm run prisma:seed` — сид тестовых пицц

## Где используется БД

- `prisma/schema.prisma` — схема моделей
- `lib/prisma.js` — singleton Prisma Client
- `server.js` — API `/api/pizzas` читает данные из PostgreSQL
