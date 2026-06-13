require("dotenv").config();
const { Telegraf } = require('telegraf');
const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();
function generateCode(length = 6) {
  return Math.floor(10 ** (length - 1) + Math.random() * 9 * 10 ** (length - 1));
}

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
  const code = generateCode(6);

  await prisma.tgcode.create({
    data: {
      code: code
    }
  });

  await ctx.reply(
    [
      `Ваш код для входа: ${code}`,
      "",
      `Ваш Telegram chat id: ${ctx.chat.id}`,
      "",
      "Этот chat id нужен для TELEGRAM_ADMIN_CHAT_ID, чтобы получать уведомления о заказах."
    ].join("\n")
  );

  setInterval(async () => {
    await prisma.tgcode.deleteMany({
      where: {
        code: code,
      }
    });
  }, 60 * 10000);
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
      "/myid — узнать chat id для уведомлений о заказах",
      "",
      "Пишите команды именно этому боту OWNpizza, не BotFather."
    ].join("\n")
  );
});

bot.launch();

module.exports = bot;