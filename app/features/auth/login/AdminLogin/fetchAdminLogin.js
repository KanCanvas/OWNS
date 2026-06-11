import axios from "axios";

const fetchAdminLogin = async (data) => {
    const response = await axios.post("/api/auth/adminlogin", data);
    return response;
}

export default fetchAdminLogin;