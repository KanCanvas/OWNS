import responses from "./fetchLogin";
import { saveAuthSession } from "../../../../lib/auth-storage";

// Бизнес логика для входа в систему и для Админа
export const modelLogin =  async (data, { reset, onClose, router } = {}) => {
    try {
          const response = await responses(data);
          if(response.data.user.isAdmin) {
            return response.data.user.phone;
          }
        if (response.status === 200 || response.status === 201) {
          const { token, user } = response.data;
          saveAuthSession({ token, user });
          reset();
          onClose?.();
          router.push("/account");
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
}