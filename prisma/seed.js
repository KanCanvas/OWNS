const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const pizzas = [
    { name: "Маргарита", size: "30 см", price: 1790, rating: 4.7 },
    { name: "Пепперони", size: "30 см", price: 1890, rating: 4.9 },
    { name: "Пепперони фреш", size: "30 см", price: 1890, rating: 4.8 },
    { name: "Ветчина и грибы", size: "30 см", price: 1890, rating: 4.8 },
    { name: "4 сезона", size: "30 см", price: 2190, rating: 4.9 }
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
