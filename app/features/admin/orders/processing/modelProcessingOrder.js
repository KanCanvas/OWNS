import fetchProcessingOrder from "./fetchProcessingOrder";

export const modelProcessingOrder = async (orderId) => {
    try {
        const response = await fetchProcessingOrder(orderId);

        if(response.status === 200){
            alert(response.data.message);
            return true;
        }
    } catch (error) {
        console.error("Failed to process order:", error);
        throw error;
    }
}