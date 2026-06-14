const CODE_TTL_MS = 10 * 60 * 1000;

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

  return { ok: true, codetg };
}

async function assertTelegramMatchesUser(prisma, user, codetg) {
  if (user.telegramId && user.telegramId !== codetg.telegramId) {
    return {
      ok: false,
      error:
        "Этот код выдан другому Telegram-аккаунту. Войдите со своим номером и своим кодом из бота.",
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

  return { ok: true };
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
