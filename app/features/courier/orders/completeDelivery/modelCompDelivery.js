import fetchCompDelivery from "./fetchCompDelivery";

export const modelCompDelivery = async (userId) => {
    try {
        const response = await fetchCompDelivery(userId);

        if(response.status === 200){
            return true;
        }
    } catch (error) {
        console.error("Failed to take order:", error);
        throw error;
    }
}