"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import styles from "./ComponentRegister.module.css";
import axios from "axios";

export const ComponentRegister = () => {
  const { register, handleSubmit, reset } = useForm();
  const telegramBotUrl = "https://t.me/OwnPizza_auth_bot";
  const [registerMethod, setRegisterMethod] = useState(null);

  useEffect(() => {
    reset();
  }, [registerMethod, reset]);

  const onSubmit = async (formData) => {
    try {
      const response = await axios.post("/api/auth/register", formData);
      console.log("Полный ответ:", response);
      console.log("Данные от сервера:", response.data);
      console.log("Статус:", response.status);
      if (response.status === 200 || response.status === 201) {
        alert("Успешно");
        reset();
      }
    } catch (error) {
      console.log("Ошибка:", error);
      if (error.response) {
        console.log("Ответ сервера с ошибкой:", error.response.data);
        console.log("Статус ошибки:", error.response.status);
        alert(error.response.data?.error || "Ошибка регистрации");
      } else {
        alert("Сервер недоступен или запрос не отправился");
      }
    }
  };

  return (
    <div className={styles.register}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          {registerMethod === "email"
            ? "Заполните данные — вход будет по email и паролю."
            : registerMethod === "telegram"
              ? "Укажите телефон и код из SMS, затем привяжите Telegram через бота."
              : "Выберите удобный способ регистрации."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <p className={styles.methodLabel}>Способ регистрации</p>
        <div
          className={styles.methodPicker}
          role="group"
          aria-label="Выбор способа регистрации"
        >
          <button
            type="button"
            className={`${styles.methodOption} ${styles.methodOptionTg} ${registerMethod === "telegram" ? styles.methodOptionActive : ""}`}
            onClick={() => {
              setRegisterMethod("telegram");
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
            className={`${styles.methodOption} ${registerMethod === "email" ? styles.methodOptionActive : ""}`}
            onClick={() => setRegisterMethod("email")}
          >
            <span className={styles.methodOptionEmoji} aria-hidden>✉</span>
            Продолжить по почте
          </button>
        </div>

        {registerMethod && (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Имя</span>
            <div className={styles.inputWrap}>
              <input
                {...register("name", { required: true })}
                type="text"
                className={`${styles.input} ${styles.inputTel}`}
                placeholder="Как к вам обращаться"
                autoComplete="name"
              />
            </div>
          </label>
        )}

        {registerMethod === "email" && (
          <>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <div className={styles.inputWrap}>
                <input
                  {...register("email", { required: true })}
                  type="email"
                  className={`${styles.input} ${styles.inputTel}`}
                  placeholder="example@mail.com"
                  autoComplete="email"
                />
              </div>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Пароль</span>
              <div className={styles.inputWrap}>
                <input
                  {...register("password", { required: true })}
                  type="password"
                  className={`${styles.input} ${styles.inputTel}`}
                  placeholder="Не менее 6 символов"
                  autoComplete="new-password"
                />
              </div>
            </label>
          </>
        )}

        {registerMethod === "telegram" && (
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
          </>
        )}

        {registerMethod && (
          <>
            <button type="submit" className={styles.primaryBtn}>
              Регистрация
            </button>
            <p className={styles.hint}>
              Нажимая кнопку, вы соглашаетесь с условиями сервиса (демо).
            </p>
          </>
        )}
      </form>
    </div>
  );
};
