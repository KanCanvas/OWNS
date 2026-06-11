"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BasketModal from "./BasketModal";
import ModalLogin from "@/app/features/auth/login/ModalLogin";
import { AUTH_CHANGE_EVENT, getStoredUser } from "../lib/auth-storage";

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const syncAuthState = () => {
      setCurrentUser(getStoredUser());
    };

    syncAuthState();
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuthState);
    window.addEventListener("storage", syncAuthState);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="brand-wrap">
          <img
            src="/img/logo.png"
            alt="OwnPizza"
            className="brand-logo"
            width={118}
            height={118}
          />
          <span className="brand-tagline">
            <span className="brand-tagline-top">Каждый кусочек</span>
            <span className="brand-tagline-bottom">попадание в цель</span>
          </span>
        </Link>

        <label className="search-wrap" aria-label="Поиск пиццы">
          <span className="search-icon">⌕</span>
          <input className="search-input" placeholder="Поиск пиццы..." />
        </label>

        <div className="header-actions">
          {currentUser ? (
            <Link href="/account" className="outline-button">
              {currentUser.name || "Аккаунт"}
            </Link>
          ) : (
            <button
              className="outline-button"
              type="button"
              onClick={() => setIsModalOpen(true)}
            >
              Войти
            </button>
          )}
          <BasketModal onRequireLogin={() => setIsModalOpen(true)} />
          <ModalLogin isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
      </div>
    </header>
  );
}
