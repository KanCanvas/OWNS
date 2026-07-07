import axios from "axios";

const fetchTakeOrder = async (orderId) => {
    const token = localStorage.getItem('token');
    const response = await axios.post('/api/courier/orders/take', { orderId }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response;
}

export default fetchTakeOrder;