export default function AboutPage() {
  return (
    <section>
      <h1>О проекте OWNpizza</h1>
      <p className="subtitle">
        Сейчас это готовый фундамент, который можно масштабировать в полноценный
        сервис доставки.
      </p>

      <div className="about-box">
        <p>
          Текущий стек: Next.js для фронтенда, Express.js для API и объединенный
          запуск на одном сервере.
        </p>
        <p>
          Следующие шаги: подключение базы данных, авторизация пользователей,
          корзина, оплата и админ-панель.
        </p>
      </div>
    </section>
  );
}
