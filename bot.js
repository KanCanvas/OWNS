require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const { PrismaClient } = require("./generated/prisma");
const { CODE_TTL_MS } = require("./lib/tg-auth");
const { formatPhoneForStorage, isPrivilegedPhone, phoneLookupVariants } = require("./lib/phone");

const prisma = new PrismaClient();

function generateCode(length = 6) {
  return Math.floor(10 ** (length - 1) + Math.random() * 9 * 10 ** (length - 1));
}

const bot = new Telegraf(process.env.BOT_TOKEN);

const contactKeyboard = Markup.keyboard([
  [Markup.button.contactRequest("📱 Поделиться контактом")],
])
  .oneTime()
  .resize();

const removeKeyboard = Markup.removeKeyboard();

async function issueTelegramCode(telegramId, phone) {
  const code = generateCode(6);
  const storedPhone = formatPhoneForStorage(phone);

  await prisma.tgcode.deleteMany({
    where: { telegramId },
  });

  await prisma.tgcode.create({
    data: {
      code,
      telegramId,
      phone: storedPhone,
    },
  });

  setTimeout(async () => {
    await prisma.tgcode.deleteMany({
      where: {
        code,
        telegramId,
      },
    });
  }, CODE_TTL_MS);

  return code;
}

async function askForContact(ctx, text) {
  await ctx.reply(text, contactKeyboard);
}

bot.start(async (ctx) => {
  await askForContact(
    ctx,
    [
      "Для входа на сайт поделитесь своим номером телефона.",
      "",
      "Нажмите кнопку ниже — Telegram отправит ваш реальный номер.",
      "После этого бот пришлёт код для входа на ownpizza.kz",
    ].join("\n")
  );
});

bot.command("code", async (ctx) => {
  await askForContact(
    ctx,
    "Поделитесь контактом, чтобы получить новый код для входа на сайт."
  );
});

bot.on("contact", async (ctx) => {
  const contact = ctx.message.contact;

  if (!contact || contact.user_id !== ctx.from.id) {
    await ctx.reply(
      "Нужно отправить именно свой контакт. Нажмите кнопку «Поделиться контактом».",
      contactKeyboard
    );
    return;
  }

  const phone = formatPhoneForStorage(contact.phone_number);
  if (!phone) {
    await ctx.reply(
      "Не удалось прочитать номер. Попробуйте ещё раз.",
      contactKeyboard
    );
    return;
  }

  if (isPrivilegedPhone(phone)) {
    await ctx.reply(
      [
        "Этот номер зарезервирован для администратора или курьера.",
        "Вход на сайте — только по паролю.",
      ].join("\n"),
      removeKeyboard
    );
    return;
  }

  const telegramId = String(ctx.chat.id);
  const code = await issueTelegramCode(telegramId, phone);
  const existingUser = await prisma.user.findFirst({
    where: {
      phone: {
        in: phoneLookupVariants(phone),
      },
    },
  });

  const actionText = existingUser
    ? "На сайте нажмите «Войти» и введите этот код."
    : "На сайте нажмите «Регистрация», укажите имя и введите этот код.";

  await ctx.reply(
    [
      `Ваш код: ${code}`,
      "",
      `Номер подтверждён: +${phone}`,
      "",
      actionText,
      "",
      "Код действует 10 минут и привязан к вашему Telegram и номеру.",
    ].join("\n"),
    removeKeyboard
  );
});

bot.command("myid", (ctx) => {
  ctx.reply(
    `Ваш Telegram chat id:\n${ctx.chat.id}\n\nДобавьте его в TELEGRAM_ADMIN_CHAT_ID на Render, чтобы получать уведомления о заказах.`
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    [
      "Доступные команды:",
      "/start — поделиться контактом и получить код",
      "/code — новый код для входа",
      "/myid — chat id для уведомлений о заказах",
      "",
      "Номер берётся только из кнопки «Поделиться контактом».",
    ].join("\n")
  );
});

bot.on("message", async (ctx) => {
  if (ctx.message.text && ctx.message.text.startsWith("/")) {
    return;
  }

  if (ctx.message.contact) {
    return;
  }

  await ctx.reply(
    "Нажмите /start и поделитесь контактом, чтобы получить код для входа.",
    contactKeyboard
  );
});

bot.launch(async () => {
  try {
    await bot.telegram.setMyDescription(
      "Нажми /start и поделись контактом, чтобы получить код для входа на сайт."
    );
  } catch (error) {
    console.error("Failed to set bot description:", error);
  }
});

module.exports = bot;
