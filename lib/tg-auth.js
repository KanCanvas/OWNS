const CODE_TTL_MS = 10 * 60 * 1000;
const { phonesMatch } = require("./phone");

function isTelegramCodeExpired(createdAt) {
  return Date.now() - new Date(createdAt).getTime() > CODE_TTL_MS;
}

async function findTelegramCode(prisma, numericSmsCode) {
  const codetg = await prisma.tgcode.findFirst({
    where: {
      code: numericSmsCode,
    },
  });

  if (!codetg) {
    return { ok: false, error: "Неверный код." };
  }

  if (isTelegramCodeExpired(codetg.createdAt)) {
    await prisma.tgcode.delete({ where: { id: codetg.id } }).catch(() => {});
    return { ok: false, error: "Код истёк. Получите новый код в Telegram-боте." };
  }

  if (!codetg.telegramId) {
    return {
      ok: false,
      error: "Код устарел. Получите новый код в Telegram-боте.",
    };
  }

  if (!codetg.phone) {
    return {
      ok: false,
      error:
        "Код без подтверждённого номера. В боте нажмите /start и поделитесь контактом.",
    };
  }

  return { ok: true, codetg };
}

async function assertTelegramMatchesUser(prisma, user, codetg) {
  if (codetg.phone && !phonesMatch(user.phone, codetg.phone)) {
    return {
      ok: false,
      error: "Номер в коде не совпадает с аккаунтом.",
    };
  }

  const telegramTaken = await prisma.user.findFirst({
    where: {
      telegramId: codetg.telegramId,
      NOT: {
        id: user.id,
      },
    },
  });

  if (telegramTaken) {
    return {
      ok: false,
      error: "Этот Telegram уже привязан к другому номеру телефона.",
    };
  }

  if (!user.telegramId || user.telegramId === codetg.telegramId) {
    return { ok: true, relink: false };
  }

  if (codetg.phone && phonesMatch(user.phone, codetg.phone)) {
    return { ok: true, relink: true };
  }

  return {
    ok: false,
    error:
      "Этот код выдан другому Telegram-аккаунту. Войдите через бота со своим контактом.",
  };
}

async function assertTelegramAvailableForRegister(prisma, codetg) {
  const telegramTaken = await prisma.user.findFirst({
    where: {
      telegramId: codetg.telegramId,
    },
  });

  if (telegramTaken) {
    return {
      ok: false,
      error: "Этот Telegram уже привязан к другому аккаунту.",
    };
  }

  return { ok: true };
}

async function consumeTelegramCode(prisma, codetgId) {
  await prisma.tgcode.delete({ where: { id: codetgId } }).catch(() => {});
}

module.exports = {
  CODE_TTL_MS,
  findTelegramCode,
  assertTelegramMatchesUser,
  assertTelegramAvailableForRegister,
  consumeTelegramCode,
};
