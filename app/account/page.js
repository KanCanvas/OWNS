"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession, getStoredUser } from "../../lib/auth-storage";
import { ModalUserModals } from "./userOrders/modalUserModals";

function isAdminUser(user) {
  if (!user) return false;
  if (user.isAdmin) return true;

  const adminPhone = String(process.env.NEXT_PUBLIC_ADMIN_PHONE || "").replace(
    /\D/g,
    ""
  );
  const userPhone = String(user.phone || "").replace(/\D/g, "");

  return adminPhone.length > 0 && userPhone === adminPhone;
}

function isCourierUser(user) {
  if (!user) return false;
  if (user.isCourier) return true;

  const courierPhone = String(process.env.NEXT_PUBLIC_COURIER_PHONE || "").replace(
    /\D/g,
    ""
  );
  const userPhone = String(user.phone || "").replace(/\D/g, "");

  return courierPhone.length > 0 && userPhone === courierPhone;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isOpenModal, setIsOpenModal] = useState(false);

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
        <span className="account-badge">
          {isAdminUser(user) ? "Администратор" : isCourierUser(user) ? "Курьер": "Вы вошли"}
        </span>
        <h1>Добро пожаловать, {user.name || "пользователь"}!</h1>
        <p className="subtitle">
          {isAdminUser(user)
            ? "Управляйте заказами и следите за активностью пользователей."
            : null}
        </p>

        {isAdminUser(user) ? (
          <div className="account-admin-panel">
            <p className="account-admin-text">
              Все заказы пользователей доступны в отдельном разделе.
            </p>
            <Link href="/account/orders" className="button primary account-orders-btn">
              Заказы
            </Link>
          </div>
        ) : null}

        {isCourierUser(user) ? (
          <div>
            <Link href="/account/courierOrders" className="button primary account-orders-btn">
              Заказы
            </Link>
          </div>): null}

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
          <button className="button secondary" onClick={() => setIsOpenModal(true)}>
            Заказы
          </button>
          <Link href="/" className="button secondary">
            На главную
          </Link>
          <button type="button" className="button primary" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </div>
      {isOpenModal === true? <ModalUserModals 
        isOpen={isOpenModal}
        onClose = {() => setIsOpenModal(false)}
        >
      </ModalUserModals>: null}
    </section>
  );
}
