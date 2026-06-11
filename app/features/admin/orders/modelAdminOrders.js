import fetchAdminOrders from "./fetchAdminOrders";

export const modelAdminOrders = async () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  if (!token) {
    throw new Error("Не авторизован.");
  }

  try {
    const response = await fetchAdminOrders(token);

    if (response.status === 200 && response.data?.ok) {
      return response.data.orders;
    }

    throw new Error(response.data?.error || "Не удалось загрузить заказы.");
  } catch (error) {
    const message = error?.response?.data?.error;
    throw new Error(message || error.message || "Не удалось загрузить заказы.");
  }
};

export default modelAdminOrders;
