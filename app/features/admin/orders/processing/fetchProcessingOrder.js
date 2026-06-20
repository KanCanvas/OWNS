import axios from "axios";

const fetchProcessingOrder = async (orderIds) => {
  const token = localStorage.getItem("token");
  const response = await axios.post(
    "/api/admin/orders/processing",
    { orderIds },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response;
};

export default fetchProcessingOrder;
