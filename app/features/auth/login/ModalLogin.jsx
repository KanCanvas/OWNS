"use client";

import styles from "./ModalLogin.module.css";
import { useForm } from "react-hook-form";
import { ComponentRegister } from "../register/ComponentRegister";
import { useEffect, useState } from "react";

export default function ModalLogin({ isOpen, onClose }) {
  const { register, handleSubmit, reset } = useForm();
  const telegramBotUrl = "https://t.me/OwnPizza_auth_bot";

  const [stateAuth, setStateAuth] = useState(false);
  const [loginMethod, setLoginMethod] = useState(null);

  useEffect(() => {
    reset();
  }, [loginMethod, reset]);

  if (!isOpen) return null;

  const onSubmit = (data) => {
    alert(JSON.stringify(data));
  };

  return (
    <div>
      <div
        className={styles.backdrop}
        aria-hidden
        onClick={onClose}
      />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-login-title"
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Закрыть окно входа"
        >
          ×
        </button>

        <div className={styles.head}>
          <span className={styles.iconWrap} aria-hidden>
            🍕
          </span>
          <h1 id="modal-login-title" className={styles.title}>
            Вход в аккаунт
          </h1>
          <p className={styles.subtitle}>
            Войдите, чтобы оформлять заказы быстрее и видеть историю покупок
          </p>
        </div>

        <div
          className={`${styles.tabs} ${stateAuth ? styles.tabsRight : ""}`}
          role="tablist"
          aria-label="Режим входа"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!stateAuth}
            className={`${styles.tab} ${!stateAuth ? styles.tabActive : ""}`}
            onClick={() => setStateAuth(false)}
          >
            Вход
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={stateAuth}
            className={`${styles.tab} ${stateAuth ? styles.tabActive : ""}`}
            onClick={() => setStateAuth(true)}
          >
            Регистрация
          </button>
        </div>

        {stateAuth ? (
          <ComponentRegister />
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className={styles.form}
            autoComplete="on"
          >
            <p className={styles.methodLabel}>Способ входа</p>
            <div
              className={styles.methodPicker}
              role="group"
              aria-label="Выбор способа входа"
            >
              <button
                type="button"
                className={`${styles.methodOption} ${styles.methodOptionTg} ${loginMethod === "telegram" ? styles.methodOptionActive : ""}`}
                onClick={() => {
                  setLoginMethod("telegram");
                  window.open(telegramBotUrl, "_blank", "noopener,noreferrer");
                }}
              >
                <img
                  src="/img/telegram.png"
                  alt=""
                  className={styles.methodOptionIcon}
                  width={20}
                  height={20}
                />
                Продолжить в Telegram
              </button>
              <button
                type="button"
                className={`${styles.methodOption} ${loginMethod === "email" ? styles.methodOptionActive : ""}`}
                onClick={() => setLoginMethod("email")}
              >
                <span className={styles.methodOptionEmoji} aria-hidden>✉</span>
                Продолжить по почте
              </button>
            </div>

            {loginMethod === "email" && (
              <>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Email</span>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon} aria-hidden>
                      ✉
                    </span>
                    <input
                      {...register("email", { required: true })}
                      type="email"
                      className={styles.input}
                      placeholder="example@mail.com"
                      autoComplete="username"
                    />
                  </div>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Пароль</span>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon} aria-hidden>
                      🔒
                    </span>
                    <input
                      {...register("password", { required: true })}
                      type="password"
                      className={styles.input}
                      placeholder="Введите пароль"
                      autoComplete="current-password"
                    />
                  </div>
                </label>

                <div className={styles.row}>
                  <label className={styles.checkbox}>
                    <input type="checkbox" className={styles.checkboxInput} />
                    <span className={styles.checkboxBox} aria-hidden />
                    <span>Запомнить меня</span>
                  </label>
                  <button type="button" className={styles.linkBtn}>
                    Забыли пароль?
                  </button>
                </div>

                <button type="submit" className={styles.primaryBtn}>
                  Войти
                </button>
              </>
            )}

            {loginMethod === "telegram" && (
              <>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Номер телефона</span>
                  <div className={styles.inputWrap}>
                    <input
                      {...register("phone", { required: true })}
                      type="tel"
                      className={`${styles.input} ${styles.inputTel}`}
                      placeholder="+7 (___) ___-__-__"
                      autoComplete="tel"
                    />
                  </div>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Код из SMS</span>
                  <div className={styles.inputWrap}>
                    <input
                      {...register("smsCode", { required: true })}
                      type="text"
                      inputMode="numeric"
                      className={`${styles.input} ${styles.inputTel}`}
                      placeholder="6 цифр из сообщения"
                      autoComplete="one-time-code"
                      maxLength={6}
                    />
                  </div>
                </label>

                <button type="button" className={styles.secondaryBtn}>
                  Получить код по SMS
                </button>

                <button type="submit" className={styles.primaryBtn}>
                  Войти
                </button>
              </>
            )}

            <div className={styles.divider}>
              <span>или</span>
            </div>

            <p className={styles.foot}>
              Нет аккаунта?{" "}
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => setStateAuth(true)}
              >
                Зарегистрироваться
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
