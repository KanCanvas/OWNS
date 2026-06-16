import responses from "./fetchLogin";
import { saveAuthSession } from "../../../../lib/auth-storage";

// Бизнес логика для входа в систему и для Админа
export const modelLogin = async (data, { reset, onClose, router } = {}) => {
  try {
    const response = await responses(data);

    if (response.status === 200 || response.status === 201) {
      const { token, user } = response.data;

      if (token && user) {
        saveAuthSession({
          token,
          user: {
            ...user,
            isAdmin: Boolean(user.isAdmin),
            isCourier: Boolean(user.isCourier),
          },
        });
        reset();
        onClose?.();
        router.push("/account");
        return;
      }

      if (user?.isAdmin) {
        return user.phone;
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
};