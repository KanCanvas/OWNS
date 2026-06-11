import fetchAdminLogin from "./fetchAdminLogin";

export const modelAdminLogin = async (data) => {
    try {
        const response = await fetchAdminLogin(data);
        if(response.status === 200){
            return response.data;
        }
        return {
            ok: false,
            message: response.data?.error || "Ошибка при входе"
        };
    }catch (error){
        console.error("Failed to login:", error);
        if (error.response?.data) {
            return {
                ok: false,
                message: error.response.data.error || "Ошибка при входе"
            };
        }
        return { ok: false, message: "Ошибка при входе" };
    }
}

export default modelAdminLogin;