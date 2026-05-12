const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const pizzas = [
    { name: "Маргарита", size: "30 см", price: 249, rating: 4.7 },
    { name: "Пепперони", size: "35 см", price: 339, rating: 4.9 },
    { name: "4 Сыра", size: "30 см", price: 379, rating: 4.8 },
    { name: "Цыпленок Барбекю", size: "35 см", price: 419, rating: 4.9 }
  ];

  for (const pizza of pizzas) {
    await prisma.pizza.upsert({
      where: { name_size: { name: pizza.name, size: pizza.size } },
      update: {
        price: pizza.price,
        rating: pizza.rating
      },
      create: pizza
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed.");
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
