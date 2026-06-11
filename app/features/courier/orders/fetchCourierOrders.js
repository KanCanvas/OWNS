import axios from "axios";

const fetchCourierOrders = async (token) => {
  const response = await axios.get("/api/courier/orders", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response;
};

export default fetchCourierOrders;
