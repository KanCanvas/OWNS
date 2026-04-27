"use client";

import { useEffect, useState } from "react";

export default function MenuPage() {
  const [pizzas, setPizzas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPizzas() {
      try {
        const response = await fetch("/api/pizzas");
        if (!response.ok) {
          throw new Error("Не получилось загрузить меню");
        }
        const data = await response.json();
        setPizzas(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPizzas();
  }, []);

  if (loading) return <p>Загрузка меню...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section>
      <h1>Меню пицц</h1>
      <p className="subtitle">Данные сейчас приходят из Express API.</p>
      <div className="pizza-grid">
        {pizzas.map((pizza) => (
          <article key={pizza.id} className="pizza-card">
            <h3>{pizza.name}</h3>
            <p>Размер: {pizza.size}</p>
            <p>Рейтинг: {pizza.rating}</p>
            <p className="price">{pizza.price} сом</p>
            <button className="button primary">В корзину</button>
          </article>
        ))}
      </div>
    </section>
  );
}
