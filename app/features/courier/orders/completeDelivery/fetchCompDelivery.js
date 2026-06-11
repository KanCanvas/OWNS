import axios from "axios";

const fetchCompDelivery = async (usersId) => {
    const token = localStorage.getItem('token');
    const response = await axios.post('/api/courier/complete/delivery', { usersId }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response;
}

export default fetchCompDelivery;