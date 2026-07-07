import responses from "./fetchLogin";
import { saveAuthSession } from "../../../../lib/auth-storage";

export const modelLogin = async (data, { reset, onClose, router } = {}) => {
  try {
    const response = await responses(data);

    if (response.status === 200 || response.status === 201) {
      const { token, user, requiresPassword, isAdmin, isCourier } =
        response.data;

      if (requiresPassword) {
        return {
          requiresPassword: true,
          isAdmin: Boolean(isAdmin),
          isCourier: Boolean(isCourier),
        };
      }

      if (token && user) {
        saveAuthSession({ token, user });
        reset();
        onClose?.();
        router.push("/account");
        return { ok: true };
      }
    }
  } catch (error) {
    console.error("Failed to login:", error);
    if (error.response) {
      console.log("Ответ сервера с ошибкой:", error.response.data);
      console.log("Статус ошибки:", error.response.status);
      alert(error.response.data.error);
    } else {
      alert("Ошибка при входе");
    }
  }

  return null;
};
