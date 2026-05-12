const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const next = require("next");
const prisma = require("./lib/prisma");

const port = Number(process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const fallbackPizzas = [
  { id: 1, name: "Маргарита", size: "30 см", price: 249, rating: 4.7 },
  { id: 2, name: "Пепперони", size: "35 см", price: 339, rating: 4.9 },
  { id: 3, name: "4 Сыра", size: "30 см", price: 379, rating: 4.8 },
  { id: 4, name: "Цыпленок Барбекю", size: "35 см", price: 419, rating: 4.9 }
];

const constructorIngredients = [
  "Моцарелла",
  "Чеддер",
  "Пармезан",
  "Пепперони",
  "Курица",
  "Бекон",
  "Грибы",
  "Томаты",
  "Халапеньо",
  "Оливки",
  "Лук",
  "Базилик"
];

app
  .prepare()
  .then(() => {
    const server = express();

    server.use(express.json());
    server.use(cookieParser());

    if (!process.env.DATABASE_URL) {
      console.warn(
        "[OWNpizza] DATABASE_URL не задан. Создайте файл .env (см. .env.example) и поднимите Postgres: docker compose up -d"
      );
    }

    server.get("/api/health", (_req, res) => {
      res.json({
        ok: true,
        service: "OWNpizza",
        timestamp: new Date().toISOString()
      });
    });

    server.get("/api/pizzas", async (_req, res) => {
      try {
        const pizzas = await prisma.pizza.findMany({
          orderBy: { id: "asc" }
        });

        // Fallback keeps UI usable before database setup is complete.
        if (!pizzas.length) {
          return res.json(fallbackPizzas);
        }

        return res.json(pizzas);
      } catch (error) {
        console.error("Failed to load pizzas from DB:", error);
        return res.json(fallbackPizzas);
      }
    });

    server.get("/constructorpizza", (_req, res) => {
      res.json({
        ingredients: constructorIngredients
      });
    });

    server.post("/order", async (req, res) => {
      try {
        const { pizza, count, total, paymentMethod } = req.body || {};

        const numericCount = Number(count);
        if (!pizza || !Number.isFinite(numericCount) || numericCount <= 0) {
          return res
            .status(400)
            .json({ ok: false, error: "Корзина пуста или данные некорректны." });
        }

        const allowedMethods = new Set(["CASH", "KASPI"]);
        const normalizedMethod = String(paymentMethod || "").toUpperCase();
        if (!allowedMethods.has(normalizedMethod)) {
          return res.status(400).json({
            ok: false,
            error: "Выберите способ оплаты: наличные или Kaspi."
          });
        }

        const pizzaPrice =
          typeof pizza.price === "number" && Number.isFinite(pizza.price)
            ? Math.round(pizza.price)
            : null;

        const computedTotal =
          typeof total === "number" && Number.isFinite(total)
            ? Math.round(total)
            : pizzaPrice !== null
              ? pizzaPrice * numericCount
              : 0;

        const order = await prisma.order.create({
          data: {
            pizzaId:
              typeof pizza.id === "number" && Number.isFinite(pizza.id)
                ? pizza.id
                : null,
            pizzaName: String(pizza.name || "Без названия"),
            pizzaSize: pizza.size ? String(pizza.size) : null,
            pizzaPrice,
            count: numericCount,
            total: computedTotal,
            paymentMethod: normalizedMethod
          }
        });

        return res.status(201).json({ ok: true, order });
      } catch (error) {
        console.error("Failed to save order:", error);
        const msg = String(error?.message || "");
        const isDbUrl =
          msg.includes("DATABASE_URL") ||
          error?.name === "PrismaClientInitializationError";
        const isConnection =
          msg.includes("Can't reach database server") ||
          msg.includes("P1001");
        return res.status(500).json({
          ok: false,
          error: isDbUrl
            ? "База не настроена: в корне проекта нужен файл .env с DATABASE_URL (см. .env.example)."
            : isConnection
              ? "Не удаётся подключиться к PostgreSQL. Запустите Docker и выполните: docker compose up -d"
              : "Не удалось сохранить заказ."
        });
      }
    });
    server.post("/api/auth/register", async (req, res) => {
      try {
        const {name, phone, smsCode } = req.body || {};
        const normalizedName = String(name || "").trim();
        const normalizedPhone = String(phone || "").trim();
        const numericSmsCode = Number(smsCode);

        if (!normalizedName || !normalizedPhone || !smsCode) {
          return res.status(400).json({
            ok: false,
            error: "Не все данные заполнены."
          });
        }

        if (!Number.isFinite(numericSmsCode)) {
          return res.status(400).json({
            ok: false,
            error: "Код из SMS должен быть числом."
          });
        }

        const codetg = await prisma.tgcode.findFirst({
          where: {
            code: numericSmsCode
          }
        });

        if (!codetg) {
          return res.status(400).json({
            ok: false,
            error: "Неверный код."
          });
        }

        const existingUser = await prisma.user.findFirst({
          where: {
            phone: normalizedPhone
          }
        });

        if (existingUser) {
          return res.status(400).json({
            ok: false,
            error: "Пользователь с этим номером уже зарегистрирован."
          });
        }
        
        const users = await prisma.user.create({
          data: {
            name: normalizedName,
            phone: normalizedPhone,
            smsCode: numericSmsCode
          }
        });
        
        return res.status(201).json({ ok: true, user: users });
      } catch (error) {
        console.error("Failed to register user:", error);
        return res.status(500).json({
          ok: false,
          error: "Не удалось зарегистрировать пользователя."
        });
      }
    });

    server.post("/api/auth/login", async (req, res) => {
      try {
        const { phone, smsCode } = req.body || {};
        const normalizedPhone = String(phone || "").trim();
        const numericSmsCode = Number(smsCode);
        if (!normalizedPhone || !smsCode) {
          return res.status(400).json({
            ok: false,
            error: "Не все данные заполнены."
          });
        }
        
        if (!Number.isFinite(numericSmsCode)) {
          return res.status(400).json({
            ok: false,
            error: "Код из SMS должен быть числом."
          });
        }
        const codetg = await prisma.tgcode.findFirst({
          where: {
            code: numericSmsCode
          }
        });
        if (!codetg) {
          return res.status(400).json({
            ok: false,
            error: "Неверный код."
          });
        }
        const user = await prisma.user.findFirst({
          where: {
            phone: normalizedPhone
          }
        });
        if (!user) {
          return res.status(400).json({
            ok: false,
            error: "Пользователь не найден."
          });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        return res.status(200).json({ ok: true, token, user: { id: user.id, name: user.name, phone: user.phone } });
      } catch (error) {
        console.error("Failed to login:", error);
        return res.status(500).json({
          ok: false,
          error: "Не удалось выполнить вход."
        });
      }
    });

    server.all("/{*any}", (req, res) => handle(req, res));

    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`OWNpizza is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start OWNpizza server:", err);
    process.exit(1);
  });
