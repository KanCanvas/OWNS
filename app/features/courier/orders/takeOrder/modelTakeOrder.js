import fetchTakeOrder from "./fetchTakeOrder";

export const modelTakeOrder = async (orderId) => {
    try {
        const response = await fetchTakeOrder(orderId);

        if(response.status === 200){
            return true;
        }
    } catch (error) {
        console.error("Failed to take order:", error);
        throw error;
    }
}