"use client";

import Link from "next/link";
import { useState } from "react";
import BasketModal from "./BasketModal";
import ModalLogin from "@/app/features/auth/login/ModalLogin";

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="brand-wrap">
          <span className="brand-icon">🍕</span>
          <span className="brand-text">
            <strong className="brand">OWN PIZZA</strong>
            <span className="brand-caption">ВКУСНЕЕ УЖЕ НЕКУДА</span>
          </span>
        </Link>

        <label className="search-wrap" aria-label="Поиск пиццы">
          <span className="search-icon">⌕</span>
          <input className="search-input" placeholder="Поиск пиццы..." />
        </label>

        <div className="header-actions">
          <button
            className="outline-button"
            type="button"
            onClick={() => setIsModalOpen(true)}
          >
            Войти
          </button>
          <BasketModal />
          <ModalLogin isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
      </div>
    </header>
  );
}
