import axios from "axios";

const fetchProcessingOrder = async (orderId) => {
    const token = localStorage.getItem('token');
    const response = await axios.post('/api/admin/orders/processing', { orderId }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response;
}

export default fetchProcessingOrder;