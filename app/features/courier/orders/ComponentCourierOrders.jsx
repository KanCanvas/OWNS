"use client"
import { useEffect, useMemo, useState } from "react";
import modelCourierOrders from "./modelCourierOrders";
import styles from "./Orders.module.css";
import { modelTakeOrder } from "./takeOrder/modelTakeOrder";
import { modelCompDelivery } from "./completeDelivery/modelCompDelivery";
import DeliveryMap from "../../../../components/DeliveryMap";
import { useCourierLocationShare } from "../../../../lib/useCourierLocationShare";


export const ComponentCourierOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [trigger, setTrigger] = useState(false);
    const [trackingByUser, setTrackingByUser] = useState({});

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

    const activeDeliveries = useMemo(() => {
        return orders
            .filter((group) =>
                group.orders.some((order) => order.idCourier && !order.ComplDelevery)
            )
            .map((group) => ({ userId: group.userId }));
    }, [orders]);

    const { coords: liveCourierCoords, geoError, geoDenied, retryGeoLocation } =
        useCourierLocationShare(activeDeliveries);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token || !activeDeliveries.length) {
            setTrackingByUser({});
            return;
        }

        let cancelled = false;

        Promise.all(
            activeDeliveries.map(async (delivery) => {
                const response = await fetch(
                    `/api/delivery/tracking?userId=${delivery.userId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                ).catch(() => null);

                if (!response?.ok) return [delivery.userId, null];

                const data = await response.json();
                return [delivery.userId, data.tracking];
            })
        ).then((entries) => {
            if (cancelled) return;
            setTrackingByUser(Object.fromEntries(entries));
        });

        return () => {
            cancelled = true;
        };
    }, [activeDeliveries, trigger]);

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

    {orders.map((group) => {
      const isActiveDelivery = group.orders.some(
        (order) => order.idCourier && !order.ComplDelevery
      );
      const tracking = trackingByUser[group.userId];

      return (
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

        {isActiveDelivery && tracking?.isActive ? (
          <div className={styles.mapBlock}>
            <p className={styles.mapLabel}>Маршрут доставки</p>
            {geoError ? (
              <div className={styles.geoHint}>
                <p className={styles.geoHintText}>{geoError}</p>
                <button
                  type="button"
                  className={styles.geoRetryBtn}
                  onClick={retryGeoLocation}
                >
                  Разрешить геолокацию
                </button>
                {geoDenied ? (
                  <p className={styles.geoHintHelp}>
                    Если окно не появилось: Настройки iPhone → Safari →
                    Геопозиция → ownpizza.kz → «При использовании приложения».
                    На Mac: Safari → Настройки → Веб-сайты → Службы геолокации.
                  </p>
                ) : null}
              </div>
            ) : null}
            <DeliveryMap
              destination={tracking.destination}
              courier={liveCourierCoords || tracking.courier}
              enableDeviceLocate
              size="large"
            />
          </div>
        ) : null}


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
                  {order.ComplDelevery
                    ? "Доставлен"
                    : order.idCourier
                      ? "В пути"
                      : order.complete
                        ? "Готово"
                        : "В процессе"}
                </span>
              </div>
            </div>
            
          ))}
          {group.orders.some((order) => order.idCourier === String(group.courierId)) 
          ? <button onClick={() => {handleCompDelivery(group.userId)}}>завершить</button>: 
            <button onClick={() => {handleTakeOrder(group.userId)}}>взять заказ</button>}
        </div>
      </div>
    )})}
  </div>
</section>
    );
};
