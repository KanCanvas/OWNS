"use client";

import styles from "./ModalLogin.module.css";
import { useForm } from "react-hook-form";
import { ComponentRegister } from "../register/ComponentRegister";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { saveAuthSession } from "../../../../lib/auth-storage";
import { modelLogin } from "./modelLogin";
import { modelAdminLogin } from "./AdminLogin/modelAdminLogin";
import { modelCourierLogin } from "./CourierLogin/modelCourierLogin"


export default function ModalLogin({ isOpen, onClose }) {
  const { register, handleSubmit, reset, setValue } = useForm();
  const telegramBotUrl = "https://t.me/OwnPizza_auth_bot";
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [stateAuth, setStateAuth] = useState(false);
  const [loginMethod, setLoginMethod] = useState(null);
  const [adminLoginStep, setAdminLoginStep] = useState(false);
  const [courierLoginStep, setCourierLoginStep] = useState(false);
  const [staffLoginMode, setStaffLoginMode] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    reset();
    setAdminLoginStep(false);
    setCourierLoginStep(false);
    setStaffLoginMode(false);
  }, [loginMethod, reset]);

  if (!isOpen || !mounted) return null;

  const handleFormSubmit = async (data) => {
    if (
      loginMethod === "telegram" &&
      staffLoginMode &&
      !adminLoginStep &&
      !courierLoginStep &&
      data.password === undefined
    ) {
      const enteredPhone = String(data.phone || "").replace(/\D/g, "");
      const adminPhone = String(process.env.NEXT_PUBLIC_ADMIN_PHONE || "").replace(
        /\D/g,
        ""
      );
      const courierPhone = String(
        process.env.NEXT_PUBLIC_COURIER_PHONE || ""
      ).replace(/\D/g, "");

      if (enteredPhone === adminPhone) {
        setValue("phone", data.phone);
        setAdminLoginStep(true);
        return;
      }

      if (enteredPhone === courierPhone) {
        setValue("phone", data.phone);
        setCourierLoginStep(true);
        return;
      }

      alert("Этот номер не зарезервирован для сотрудников.");
      return;
    }

    // После ввода пароля Админа, не нужно отправлять данные на сервер
    const shouldUserLogin =
      !adminLoginStep &&
      !courierLoginStep &&
      !staffLoginMode &&
      (loginMethod === "email" || data.password === undefined);
    if (shouldUserLogin) {
      await onSubmit(data);
      return;
    }

    if (adminLoginStep) {
      const response = await modelAdminLogin(data);
      if (!response) {
        alert("Ошибка при входе");
        return;
      }
      alert(response.message || response.error || "Ошибка при входе");
      if (response.ok) {
        const { token, user } = response;
        saveAuthSession({
          token,
          user: { ...user, isAdmin: true }
        });
        reset();
        onClose?.();
        router.push("/account");
      }
    }
    if(courierLoginStep) {
      const response = await modelCourierLogin(data);
      if (!response) {
        alert("Ошибка при входе");
        return;
      }
      alert(response.message || response.error || "Ошибка при входе");
      if (response.ok) {
        const { token, user } = response;
        saveAuthSession({
          token,
          user: { ...user, isCourier: true }
        });
        reset();
        onClose?.();
        router.push("/account");
      }
    }
  };

  const onSubmit = async (data) => {
    return await modelLogin(data, { reset, onClose, router });
  };

  return createPortal(
    <div
      className="app-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`app-modal ${styles.dialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-login-title"
        onClick={(event) => event.stopPropagation()}
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
          <ComponentRegister onClose={onClose} />
        ) : (
          <form
            onSubmit={handleSubmit(handleFormSubmit)}
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
                {adminLoginStep ? (
                  <>
                    <p className={styles.adminTitle}>АДМИН ВХОД</p>
                    <input type="hidden" {...register("phone")} />

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

                    <button type="submit" className={styles.primaryBtn}>
                      Войти
                    </button>

                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => setAdminLoginStep(false)}
                    >
                      Назад
                    </button>
                  </>
                ) : courierLoginStep ? (
                  <>
                    <p className={styles.adminTitle}>ВХОД КУРЬЕРА</p>
                    <input type="hidden" {...register("phone")} />

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

                    <button type="submit" className={styles.primaryBtn}>
                      Войти
                    </button>

                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => setCourierLoginStep(false)}
                    >
                      Назад
                    </button>
                  </>
                ) : staffLoginMode ? (
                  <>
                    <p className={styles.adminTitle}>ВХОД ДЛЯ СОТРУДНИКОВ</p>
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
                    <button type="submit" className={styles.primaryBtn}>
                      Продолжить
                    </button>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => setStaffLoginMode(false)}
                    >
                      Назад
                    </button>
                  </>
                ) : (
                  <>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Код из Telegram</span>
                  <div className={styles.inputWrap}>
                    <input
                      {...register("smsCode", { required: true })}
                      type="text"
                      inputMode="numeric"
                      className={`${styles.input} ${styles.inputTel}`}
                      placeholder="6 цифр после отправки контакта"
                      autoComplete="one-time-code"
                      maxLength={6}
                    />
                  </div>
                </label>

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() =>
                    window.open(
                      "https://t.me/OwnPizza_auth_bot",
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  Открыть бота и поделиться контактом
                </button>

                <button type="submit" className={styles.primaryBtn}>
                  Войти
                </button>

                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => setStaffLoginMode(true)}
                >
                  Вход для администратора / курьера
                </button>
                  </>
                )}
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
    </div>,
    document.body
  );
}
