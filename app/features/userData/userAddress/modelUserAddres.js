import fetchUserAddress from "./fetchUserAddres";

// Логика получение адрес пользовтаеля чтобы использовать его в компоненте
const modelUserAddress = async (data) => {
    try {
        const res = await fetchUserAddress(data);
        const address = await res.json();
        if (!res.ok) {
            throw new Error("Ошибка запроса");
        }
        return address;
    }catch(error) {
        console.log(error);
    }
    
};

export default modelUserAddress;

