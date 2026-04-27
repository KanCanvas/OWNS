const express = require("express");
const next = require("next");
const prisma = require("./lib/prisma");

const port = Number(process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const fallbackPizzas = [
  { id: 1, name: "Маргарита", size: "30 см", price: 249, rating: 4.7 },
  { id: 2, name: "Пепперони", size: "35 см", price: 339, rating: 4.9 },
  { id: 3, name: "4 Сыра", size: "30 см", price: 379, rating: 4.8 },
  { id: 4, name: "Цыпленок Барбекю", size: "35 см", price: 419, rating: 4.9 }
];

app
  .prepare()
  .then(() => {
    const server = express();

    server.use(express.json());

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

    server.all("/{*any}", (req, res) => handle(req, res));

    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`OWNpizza is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start OWNpizza server:", err);
    process.exit(1);
  });
