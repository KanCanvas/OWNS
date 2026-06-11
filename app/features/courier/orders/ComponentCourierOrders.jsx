"use client"
import { useEffect, useState } from "react";
import modelCourierOrders from "./modelCourierOrders";
import styles from "./Orders.module.css";
import { modelTakeOrder } from "./takeOrder/modelTakeOrder";
import { modelCompDelivery } from "./completeDelivery/modelCompDelivery";


export const ComponentCourierOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [trigger, setTrigger] = useState(false);

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const orders = await modelCourierOrders();
                setOrders(orders);  
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        loadOrders();
    }, [trigger]);

    const handleTakeOrder = async ( userId ) => {
      try {
        const response = await modelTakeOrder(userId);
        if(response){
          setOrders(response?.orders ?? []);
          setTrigger(prev => !prev);
        }
      } catch (error) {
        console.error("Failed to take order:", error);
        throw error;
      }
    }

    const handleCompDelivery = async (userdId) => {
      try{
        const response = await modelCompDelivery(userdId);
        if(response){
          setTrigger(prev => !prev);
        }
      } catch (error) {
        console.error("Failed to take order:", error);
        throw error;
      }
    }

    if (loading) return <p>Загрузка заказов...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <section className={styles.page}>
  <div className={styles.container}>

    <div className={styles.header}>
      <div className={styles.titleWrap}>
        <h1>Заказы</h1>
        <p>Группировка по пользователям</p>
      </div>
    </div>

    {orders.map((group) => (
      <div key={group.userId} className={styles.userCard}>

        <div className={styles.userHeader}>
          <h2 className={styles.userTitle}>
            Пользователь
          </h2>

          <span className={styles.userId}>
            #{group.userId}
          </span>
        </div>

        <div className={styles.address}>
          <p className={styles.addressLine}>
            <strong>Адрес:</strong> {group.homeaddress}
          </p>

          <p className={styles.addressDetails}>
            <span>Подъезд: {group.homeentrance}</span>
            <span>Квартира: {group.homeapartment}</span>
          </p>
        </div>


        <div className={styles.orders}>
          {group.orders.map((order) => (
            <div key={order.id} className={styles.orderCard}>

              <div className={styles.orderTop}>
                <p className={styles.pizzaName}>
                  {order.pizzaName}
                </p>

                <span className={styles.price}>
                  {order.total} ₸
                </span>
              </div>

              <div className={styles.orderBottom}>
                <span>Кол-во: {order.count}</span>
                <span>{order.paymentMethod}</span>
                <span>
                  {order.complete ? "Готово" : "В процессе"}
                </span>
              </div>
            </div>
            
          ))}
          {group.orders.some((order) => order.idCourier === String(group.courierId)) 
          ? <button onClick={() => {handleCompDelivery(group.userId)}}>завершить</button>: 
            <button onClick={() => {handleTakeOrder(group.userId)}}>взять заказ</button>}
        </div>
      </div>
    ))}
  </div>
</section>
    );
};