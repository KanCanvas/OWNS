
// Запрос на сервер для получение данные по адресу с базы данных пользователя 
const fetchUserAddress = async (data) => {
    const res = await fetch("/api/user/address", {
        method : "GET",
        headers: {
            Authorization: `Bearer ${data}`,
        }
    });

    return res;
}

export default fetchUserAddress;