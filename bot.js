require("dotenv").config();
const { Telegraf } = require('telegraf');
const { PrismaClient } = require('@prisma/client');

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
  ctx.reply(`Ваш код: ${code}`);

  setInterval( async () => {
    await prisma.tgcode.deleteMany({
      where: {
        code: code,
      }
    });
  }, 60 * 10000);
});

bot.launch();

module.exports = bot;