require("dotenv").config();
const { Telegraf } = require("telegraf");
const { PrismaClient } = require("./generated/prisma");
const { CODE_TTL_MS } = require("./lib/tg-auth");

const prisma = new PrismaClient();

function generateCode(length = 6) {
  return Math.floor(10 ** (length - 1) + Math.random() * 9 * 10 ** (length - 1));
}

const bot = new Telegraf(process.env.BOT_TOKEN);

async function issueTelegramCode(ctx) {
  const telegramId = String(ctx.chat.id);
  const code = generateCode(6);

  await prisma.tgcode.deleteMany({
    where: { telegramId },
  });

  await prisma.tgcode.create({
    data: {
      code,
      telegramId,
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

bot.start(async (ctx) => {
  const code = await issueTelegramCode(ctx);

  await ctx.reply(
    [
      `Ваш код для входа: ${code}`,
      "",
      "Код действует 10 минут и привязан к вашему Telegram.",
      "На сайте укажите свой номер телефона и этот код.",
      "",
      `Ваш Telegram chat id: ${ctx.chat.id}`,
    ].join("\n")
  );
});

bot.command("code", async (ctx) => {
  const code = await issueTelegramCode(ctx);

  await ctx.reply(
    [
      `Новый код для входа: ${code}`,
      "",
      "Код действует 10 минут и работает только с вашим Telegram.",
    ].join("\n")
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
      "/start — получить код для входа на сайт",
      "/code — получить новый код для входа",
      "/myid — узнать chat id для уведомлений о заказах",
      "",
      "Код привязан к вашему Telegram и не подойдёт для чужого номера.",
    ].join("\n")
  );
});

bot.on("message", async (ctx) => {
  if (ctx.message.text && ctx.message.text.startsWith("/")) {
    return;
  }

  await ctx.reply("Нажми /start, чтобы получить код для входа на сайт.");
});

bot.launch(async () => {
  try {
    await bot.telegram.setMyDescription(
      "Нажми /start, чтобы получить код для входа на сайт."
    );
  } catch (error) {
    console.error("Failed to set bot description:", error);
  }
});

module.exports = bot;
