"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession, getStoredUser } from "../../lib/auth-storage";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setIsReady(true);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    router.push("/");
  };

  if (!isReady) {
    return (
      <section className="account-page">
        <div className="account-card">
          <h1>Проверяем авторизацию...</h1>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="account-page">
        <div className="account-card">
          <span className="account-badge">Гость</span>
          <h1>Вы пока не вошли в аккаунт</h1>
          <p className="subtitle">
            Авторизуйтесь через Telegram, чтобы увидеть данные пользователя.
          </p>
          <div className="account-actions">
            <Link href="/" className="button primary">
              На главную
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="account-page">
      <div className="account-card">
        <span className="account-badge">Вы вошли</span>
        <h1>Добро пожаловать, {user.name || "пользователь"}!</h1>
        <p className="subtitle">
          Авторизация прошла успешно. Ниже отображаются данные текущего аккаунта.
        </p>

        <div className="account-details">
          <div className="account-row">
            <span>ID</span>
            <strong>{user.id}</strong>
          </div>
          <div className="account-row">
            <span>Имя</span>
            <strong>{user.name}</strong>
          </div>
          <div className="account-row">
            <span>Телефон</span>
            <strong>{user.phone}</strong>
          </div>
        </div>

        <div className="account-actions">
          <Link href="/" className="button secondary">
            На главную
          </Link>
          <button type="button" className="button primary" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </div>
    </section>
  );
}
