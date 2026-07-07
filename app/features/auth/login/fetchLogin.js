import axios from "axios";

const responses = async (data) => {
    const response = await axios.post("/api/auth/login", data);
    console.log("Полный ответ:", response);
    console.log("Данные от сервера:", response.data);
    console.log("Статус:", response.status);
    return response;
}

export default responses;