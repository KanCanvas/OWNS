-- AlterTable
ALTER TABLE "Tgcode" ADD COLUMN "telegramId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
