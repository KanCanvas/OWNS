import axios from "axios";

const fetchCourierLogin = async (data) => {
    const response = await axios.post("/api/auth/courierlogin", data);
    return response;
}

export default fetchCourierLogin;