const path = require("path");
const http = require("http");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const next = require("next");
const prisma = require("./lib/prisma");
const { buildOrderItemsWithGift } = require("./lib/promo");
const { notifyAdminAboutOrder } = require("./lib/telegram-notify");
const { groupOrdersByBatch } = require("./lib/order-batches");
const { normalizePhone, phoneLookupVariants, phonesMatch, isPrivilegedPhone, isAdminPhone, isCourierPhone } = require("./lib/phone");
const {
  findTelegramCode,
  assertTelegramMatchesUser,
  assertTelegramAvailableForRegister,
  consumeTelegramCode,
  assertEnteredPhoneMatchesVerified,
} = require("./lib/tg-auth");
const { compare } = require("bcryptjs");
const { initTrackingWs, notifyCustomerTracking } = require("./lib/tracking-ws");
const {
  startDeliveryTracking,
  stopDeliveryTracking,
  getActiveTrackingForUser,
  updateTrackingDestinationCoords,
  serializeTracking,
} = require("./lib/tracking-store");

const port = Number(process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const fallbackPizzas = [
  { id: 1, name: "Маргарита", size: "30 см", price: 1790, rating: 4.7 },
  { id: 2, name: "Пепперони", size: "30 см", price: 1890, rating: 4.9 },
  { id: 3, name: "Пепперони фреш", size: "30 см", price: 1890, rating: 4.8 },
  { id: 4, name: "Ветчина и грибы", size: "30 см", price: 1890, rating: 4.8 },
  { id: 5, name: "4 сезона", size: "30 см", price: 2190, rating: 4.9 }
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

async function findUserByPhone(phone) {
  const variants = phoneLookupVariants(phone);
  if (!variants.length) return null;

  return prisma.user.findFirst({
    where: {
      phone: {
        in: variants,
      },
    },
  });
}

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
        const { pizza, paymentMethod, address, entrance, apartment, addressLat, addressLng } = req.body || {};
      
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            name: true,
            phone: true,
            homeaddress: true,
            homeentrance: true,
            homeapartment: true,
          },
        });

        if (!user) {
          return res.status(401).json({ ok: false, error: "Пользователь не найден." });
        }

        if(address !== user.homeaddress || entrance !== user.homeentrance || apartment !== user.homeapartment){
          if(address !== "" && entrance !== "" && apartment !== ""){
            const parsedLat = Number(addressLat);
            const parsedLng = Number(addressLng);
            const updateData = {
              homeaddress: address,
              homeentrance: entrance,
              homeapartment: apartment,
            };

            if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
              updateData.homeLat = parsedLat;
              updateData.homeLng = parsedLng;
            }

            await prisma.user.update({
              where: {
                id: userId
              },
              data: updateData,
            })
          }
          console.log("Есть изменения в адресе доставки!");

        } else if (Number.isFinite(Number(addressLat)) && Number.isFinite(Number(addressLng))) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              homeLat: Number(addressLat),
              homeLng: Number(addressLng),
            },
          });
        }

        if(address === "" && entrance === "" && apartment === ""){
          return res.status(400).json({message: "Не указан адрес доставки"})
        }

        if (!Array.isArray(pizza) || pizza.length === 0) {
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

        const orderItems = buildOrderItemsWithGift(pizza);

        const orders = [];
        for (let i = 0; i < orderItems.length; i++) {
          const item = orderItems[i];
          if (!item) continue;

          const itemCount = Number(item.count);
          if (!Number.isFinite(itemCount) || itemCount <= 0) continue;

          const pizzaPrice =
            item.isGift
              ? 0
              : typeof item.price === "number" && Number.isFinite(item.price)
                ? Math.round(item.price)
                : null;

          const itemTotal =
            item.isGift ? 0 : pizzaPrice !== null ? pizzaPrice * itemCount : 0;

          const order = await prisma.order.create({
            data: {
              pizzaId:
                typeof item.id === "number" && Number.isFinite(item.id)
                  ? item.id
                  : null,
              userId: String(userId),
              pizzaName: item.isGift
                ? `${String(item.name || "Подарок")} 🎁`
                : String(item.name || "Без названия"),
              pizzaSize: item.size ? String(item.size) : null,
              pizzaPrice,
              count: itemCount,
              total: itemTotal,
              paymentMethod: normalizedMethod
            }
          });
          orders.push(order);
        }

        if (orders.length === 0) {
          return res.status(400).json({
            ok: false,
            error: "Корзина пуста или данные некорректны."
          });
        }

        notifyAdminAboutOrder({
          user,
          orders,
          paymentMethod: normalizedMethod,
          address,
          entrance,
          apartment,
        }).catch((error) => {
          console.error("Telegram order notification failed:", error);
        });

        return res.status(201).json({ ok: true, orders });
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

    server.get("/api/user/address", async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const user = await prisma.user.findUnique({
          where: {
            id: userId
          },
          select: {
            homeaddress: true,
            homeentrance: true,
            homeapartment: true,
            homeLat: true,
            homeLng: true,
          }
        })

        return res.json({
          ok: true,
          address: user,
        });
      } catch(error) {
        console.log(error);

        return res.status(500).json({
            ok: false,
            error: "Ошибка сервера",
        });
      }
    })

    server.post("/api/auth/register", async (req, res) => {
      try {
        const { name, phone, smsCode } = req.body || {};
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
            error: "Код должен быть числом."
          });
        }

        const codeResult = await findTelegramCode(prisma, numericSmsCode);
        if (!codeResult.ok) {
          return res.status(400).json({
            ok: false,
            error: codeResult.error,
          });
        }

        const verifiedPhone = codeResult.codetg.phone;

        const phoneCheck = assertEnteredPhoneMatchesVerified(
          normalizedPhone,
          verifiedPhone
        );
        if (!phoneCheck.ok) {
          return res.status(400).json({
            ok: false,
            error: phoneCheck.error,
          });
        }

        if (isPrivilegedPhone(verifiedPhone)) {
          return res.status(400).json({
            ok: false,
            error: "Этот номер зарезервирован. Вход только по паролю.",
          });
        }

        const telegramCheck = await assertTelegramAvailableForRegister(
          prisma,
          codeResult.codetg
        );
        if (!telegramCheck.ok) {
          return res.status(400).json({
            ok: false,
            error: telegramCheck.error,
          });
        }

        const existingUser = await findUserByPhone(verifiedPhone);

        if (existingUser) {
          return res.status(400).json({
            ok: false,
            error: "Этот номер уже зарегистрирован. Войдите с кодом из бота.",
          });
        }
        
        const users = await prisma.user.create({
          data: {
            name: normalizedName,
            phone: verifiedPhone,
            smsCode: numericSmsCode,
            telegramId: codeResult.codetg.telegramId,
          }
        });

        await consumeTelegramCode(prisma, codeResult.codetg.id);

        const token = jwt.sign({ userId: users.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        
        return res.status(201).json({ ok: true, token, user: { id: users.id, name: users.name, phone: users.phone } });
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
            error: "Код должен быть числом."
          });
        }

        const codeResult = await findTelegramCode(prisma, numericSmsCode);
        if (!codeResult.ok) {
          return res.status(400).json({
            ok: false,
            error: codeResult.error,
          });
        }

        const verifiedPhone = codeResult.codetg.phone;
        const isStaffLogin = isPrivilegedPhone(normalizedPhone);

        if (!isStaffLogin) {
          const phoneCheck = assertEnteredPhoneMatchesVerified(
            normalizedPhone,
            verifiedPhone
          );
          if (!phoneCheck.ok) {
            return res.status(400).json({
              ok: false,
              error: phoneCheck.error,
            });
          }
        }

        const user = await findUserByPhone(
          isStaffLogin ? normalizedPhone : verifiedPhone
        );
        if (!user) {
          return res.status(400).json({
            ok: false,
            error: isStaffLogin
              ? "Аккаунт сотрудника не найден. Проверьте номер администратора или курьера."
              : "Аккаунт не найден. Сначала зарегистрируйтесь через бота.",
          });
        }

        if (!isStaffLogin) {
          const telegramCheck = await assertTelegramMatchesUser(
            prisma,
            user,
            codeResult.codetg
          );
          if (!telegramCheck.ok) {
            return res.status(403).json({
              ok: false,
              error: telegramCheck.error,
            });
          }

          if (!user.telegramId || telegramCheck.relink) {
            await prisma.user.update({
              where: { id: user.id },
              data: { telegramId: codeResult.codetg.telegramId },
            });
          }

          await consumeTelegramCode(prisma, codeResult.codetg.id);

          const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

          return res.status(200).json({
            ok: true,
            token,
            user: {
              id: user.id,
              name: user.name,
              phone: user.phone,
              isAdmin: false,
              isCourier: false,
            },
          });
        }

        await consumeTelegramCode(prisma, codeResult.codetg.id);

        return res.status(200).json({
          ok: true,
          requiresPassword: true,
          isAdmin: isAdminPhone(normalizedPhone),
          isCourier: isCourierPhone(normalizedPhone),
          phone: user.phone,
        });
      } catch (error) {
        console.error("Failed to login:", error);
        return res.status(500).json({
          ok: false,
          error: "Не удалось выполнить вход."
        });
      }
    });

    server.post("/api/auth/adminlogin", async (req, res) => {
      try {
        const { password, phone } = req.body || {};
        const normalizedPassword = String(password || "").trim();
        const normalizedPhone = String(phone || "").trim();

        if (!normalizedPassword) {
          return res.status(400).json({
            ok: false,
            error: "Не все данные заполнены."
          });
        }
        if (normalizedPassword !== process.env.ADMIN_PASSWORD) {
          return res.status(400).json({
            ok: false,
            error: "Неверный пароль."
          });
        }

        const user = await findUserByPhone(normalizedPhone);
        if (!user) {
          return res.status(400).json({
            ok: false,
            error: "Пользователь не найден."
          });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        if(normalizedPassword === process.env.ADMIN_PASSWORD) {
          return res.status(200).json({
            ok: true,
            token,
            user: { id: user.id, name: user.name, phone: user.phone, isAdmin: true },
            message: "Вход в админ-панель выполнен успешно."
          });
        }
      }catch (error){
        console.error("Failed to login:", error);
        return res.status(500).json({
          ok: false,
          error: "Не удалось выполнить вход."
        });
      }
    });

    server.post("/api/auth/courierlogin", async (req, res) => {
      try{
        const { password, phone } = req.body || {};
        const normalizedPassword = String(password || "").trim();
        const normalizedPhone = String(phone || "").trim();

        if (!normalizedPassword) {
          return res.status(400).json({
            ok: false,
            error: "Не все данные заполнены."
          });
        }
        if (normalizedPassword !== process.env.COURIER_PASSWORD) {
          return res.status(400).json({
            ok: false,
            error: "Неверный пароль."
          });
        }

        const user = await findUserByPhone(normalizedPhone);
        if (!user) {
          return res.status(400).json({
            ok: false,
            error: "Пользователь не найден."
          });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        if(normalizedPassword === process.env.COURIER_PASSWORD) {
          return res.status(200).json({
            ok: true,
            token,
            user: { id: user.id, name: user.name, phone: user.phone, isCourier: true },
            message: "Вход в курьер-панель выполнен успешно."
          });
        }
      } catch (error) {
        console.log(error);
      }
    })

    const isAdminPhone = (phone) => {
      const adminPhone = String(
        process.env.ADMIN_PHONE || process.env.NEXT_PUBLIC_ADMIN_PHONE || ""
      ).replace(/\D/g, "");
      return String(phone || "").replace(/\D/g, "") === adminPhone && adminPhone.length > 0;
    };

    server.get("/api/admin/orders", async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const user = await prisma.user.findUnique({
          where: { id: Number(userId) }
        });

        if (!user || !isAdminPhone(user.phone)) {
          return res.status(403).json({ ok: false, error: "Доступ запрещён." });
        }

        const orders = await prisma.order.findMany({
          where: {
            ComplDelevery: false,
            OR: [{ take: false }, { take: true, complete: false }],
          },
          orderBy: { createdAt: "desc" },
        });

        const numericUserIds = [
          ...new Set(
            orders
              .map((order) => Number(order.userId))
              .filter((id) => Number.isFinite(id))
          ),
        ];

        const users = numericUserIds.length
          ? await prisma.user.findMany({
              where: { id: { in: numericUserIds } },
            })
          : [];

        const usersById = Object.fromEntries(users.map((item) => [String(item.id), item]));
        const groupedOrders = groupOrdersByBatch(orders, usersById);

        return res.status(200).json({
          ok: true,
          orders: groupedOrders,
        });
      } catch (error) {
        console.error("Failed to load admin orders:", error);
        return res.status(500).json({
          ok: false,
          error: "Не удалось загрузить заказы."
        });
      }
    });

    server.get("/api/courier/orders", async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        let orders = await prisma.order.findMany({
          where: {
            idCourier: String(userId),
            ComplDelevery: false,
          },
        });

        if (!orders.length) {
          orders = await prisma.order.findMany({
            where: {
              complete: true,
              ComplDelevery: false,
              idCourier: null,
            },
          });
        }

        const userIds = orders.map(order => Number(order.userId));

        const users = await prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
        });

        const grouped = Object.values(
          orders.reduce((acc, order) => {
            const user = users.find(
              user => user.id === Number(order.userId)
            );

            (acc[order.userId] ??= {
              userId: order.userId,
              courierId: userId,
              homeaddress: user?.homeaddress,               
              homeentrance: user?.homeentrance,               
              homeapartment: user?.homeapartment,  
              orders: []
            }).orders.push(order);
        
            return acc;
          }, {})
        );

        return res.status(200).json({ ok: true, orders: grouped});
        
      } catch (error) {
        console.error("Failed to load courier orders:", error);
        return res.status(500).json({
          ok: false,
          error: "Не удалось загрузить заказы."
        });
      }
    })

    server.post('/api/admin/orders/processing', async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const { orderIds } = req.body || {};
        const normalizedOrderIds = Array.isArray(orderIds)
          ? orderIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
          : [];

        if (!normalizedOrderIds.length) {
          return res.status(400).json({ ok: false, error: "Не все данные заполнены." });
        }

        const orders = await prisma.order.findMany({
          where: { id: { in: normalizedOrderIds } },
        });

        if (!orders.length) {
          return res.status(400).json({ ok: false, error: "Заказ не найден." });
        }

        await prisma.order.updateMany({
          where: { id: { in: normalizedOrderIds } },
          data: { take: true },
        });
        return res.status(200).json({ ok: true, message: "Заказ взят в обработку." });
      }catch (error){
        console.error("Failed to process order:", error);
        return res.status(500).json({ ok: false, error: "Не удалось взять заказ в обработку." });
      }
    });

    server.post('/api/courier/orders/take', async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const { orderId } = req.body || {};
        const normalizedOrderId = Number(orderId);
        if (!normalizedOrderId) {
          return res.status(400).json({ ok: false, error: "Не все данные заполнены." });
        }

        await prisma.order.updateMany({
          where: { userId: String(normalizedOrderId), complete: true },
          data: { idCourier: String(userId) }
        });

        const customer = await prisma.user.findUnique({
          where: { id: normalizedOrderId },
        });

        const tracking = await startDeliveryTracking(prisma, {
          userId: normalizedOrderId,
          courierId: userId,
          streetAddress: customer?.homeaddress || "",
          entrance: customer?.homeentrance || "",
          apartment: customer?.homeapartment || "",
          destLat: customer?.homeLat,
          destLng: customer?.homeLng,
        });

        return res.status(200).json({
          ok: true,
          message: "Заказ взят.",
          tracking: serializeTracking(tracking),
        });
      } catch (error) {
        console.error("Failed to take order:", error);
        return res.status(500).json({ ok: false, error: "Не удалось взять заказ." });
      }
    })

    server.post('/api/courier/complete/delivery', async (req, res) => {
      try{
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const { usersId } = req.body || {};
        const normalizedUsersId = Number(usersId);
        if (!normalizedUsersId) {
          return res.status(400).json({ ok: false, error: "Не все данные заполнены." });
        }

        await prisma.order.updateMany({
          where: {userId: String(normalizedUsersId), complete: true, idCourier: String(userId)},
          data: {ComplDelevery: true}
        });

        await stopDeliveryTracking(prisma, normalizedUsersId);

        notifyCustomerTracking(normalizedUsersId, {
          userId: String(normalizedUsersId),
          courierId: String(userId),
          destLat: 0,
          destLng: 0,
          courierLat: null,
          courierLng: null,
          isActive: false,
          updatedAt: new Date(),
        });

         return res.status(200).json({ok: true, complDelivery: true});
      } catch (error) {
        console.log(error)
      }
    })

    server.get("/api/admin/orders/processing", async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const user = await prisma.user.findUnique({
          where: { id: Number(decoded.userId) }
        });

        if (!user || !isAdminPhone(user.phone)) {
          return res.status(403).json({ ok: false, error: "Доступ запрещён." });
        }

        const orders = await prisma.order.findMany({
          orderBy: { createdAt: "desc" }
        });

        return res.status(200).json({ ok: true, orders });
      } catch (error) {
        console.error("Failed to load processing order:", error);
        return res.status(500).json({
          ok: false,
          error: "Не удалось загрузить обработанные заказы."
        });
      }
    });

    server.post("/user/orders", async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const orders = await prisma.order.findMany({
          where: {
            userId: String(userId)
          },
          orderBy: {
            createdAt: "desc"
          }
        });

        return res.status(200).json({
          ok: true,
          orders: orders,
          message: "Запрос прошел успешно"
        });
      } catch (error) {
        console.error("Failed to load user orders:", error);
        if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }
        return res.status(500).json({
          ok: false,
          error: "Не удалось загрузить заказы."
        });
      }
    });

    server.post("/api/admin/orders/complete", async (req, res) => {
      try{
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const user = await prisma.user.findUnique({
          where: { id: Number(userId) }
        });

        if (!user || !isAdminPhone(user.phone)) {
          return res.status(403).json({ ok: false, error: "Доступ запрещён." });
        }

        const { orderIds } = req.body || {};
        const normalizedOrderIds = Array.isArray(orderIds)
          ? orderIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
          : [];

        if (!normalizedOrderIds.length) {
          return res.status(400).json({ ok: false, error: "Не все данные заполнены." });
        }

        const orders = await prisma.order.findMany({
          where: { id: { in: normalizedOrderIds } },
        });

        if (!orders.length) {
          return res.status(400).json({ ok: false, error: "Заказ не найден." });
        }

        await prisma.order.updateMany({
          where: { id: { in: normalizedOrderIds } },
          data: { complete: true },
        });
        return res.status(200).json({ ok: true, message: "Заказ готов к доставке." });
      }catch(error){
        console.error("Failed to process order:", error);
        return res.status(500).json({ ok: false, error: "Не удалось взять заказ в обработку." });
      }
    })

    server.get("/api/delivery/tracking", async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const requestedUserId = req.query.userId
          ? String(req.query.userId)
          : String(userId);

        let tracking;

        if (requestedUserId !== String(userId)) {
          const authUser = await prisma.user.findUnique({
            where: { id: Number(userId) },
          });

          if (!authUser || !isCourierPhone(authUser.phone)) {
            return res.status(403).json({ ok: false, error: "Доступ запрещён." });
          }

          tracking = await getActiveTrackingForUser(prisma, requestedUserId);

          if (tracking && String(tracking.courierId) !== String(userId)) {
            return res.status(403).json({ ok: false, error: "Доступ запрещён." });
          }
        } else {
          tracking = await getActiveTrackingForUser(prisma, userId);
        }

        return res.status(200).json({
          ok: true,
          tracking: serializeTracking(tracking),
        });
      } catch (error) {
        console.error("Failed to load delivery tracking:", error);
        return res.status(500).json({
          ok: false,
          error: "Не удалось загрузить отслеживание доставки.",
        });
      }
    });

    server.post("/api/delivery/tracking/destination", async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) {
          return res.status(401).json({ ok: false, error: "Не авторизован." });
        }

        const { lat, lng, address } = req.body || {};
        const parsedLat = Number(lat);
        const parsedLng = Number(lng);

        if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
          return res.status(400).json({ ok: false, error: "Некорректные координаты." });
        }

        const tracking = await updateTrackingDestinationCoords(prisma, userId, {
          lat: parsedLat,
          lng: parsedLng,
          address,
        });

        if (!tracking) {
          return res.status(404).json({ ok: false, error: "Активная доставка не найдена." });
        }

        await prisma.user.update({
          where: { id: Number(userId) },
          data: {
            homeLat: parsedLat,
            homeLng: parsedLng,
          },
        });

        return res.status(200).json({
          ok: true,
          tracking: serializeTracking(tracking),
        });
      } catch (error) {
        console.error("Failed to update tracking destination:", error);
        return res.status(500).json({
          ok: false,
          error: "Не удалось обновить адрес на карте.",
        });
      }
    });

    server.all("/{*any}", (req, res) => handle(req, res));

    const httpServer = http.createServer(server);
    initTrackingWs(httpServer, {
      jwtSecret: process.env.JWT_SECRET,
      prisma,
    });

    httpServer.listen(port, (err) => {
      if (err) throw err;
      console.log(`OWNpizza is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start OWNpizza server:", err);
    process.exit(1);
  });
