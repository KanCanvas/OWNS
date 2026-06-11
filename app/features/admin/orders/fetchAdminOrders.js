import axios from "axios";

const fetchAdminOrders = async (token) => {
  const response = await axios.get("/api/admin/orders", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response;
};

export default fetchAdminOrders;
