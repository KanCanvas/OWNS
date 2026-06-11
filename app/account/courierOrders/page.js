"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ComponentAdminOrders from "../../features/admin/orders/ComponentAdminOrders";
import { getStoredUser } from "../../../lib/auth-storage";
import { ComponentCourierOrders } from "../../features/courier/orders/ComponentCourierOrders";

function isCourierUser(user) {
  if (!user) return false;
  if (user.isCourier) return true;

  const couerierPhone = String(process.env.NEXT_PUBLIC_COURIER_PHONE || "").replace(
    /\D/g,
    ""
  );
  const userPhone = String(user.phone || "").replace(/\D/g, "");

  return couerierPhone.length > 0 && userPhone === couerierPhone;
}

export default function CourierOrdersPage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isCourier, setIsCourier] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    setIsCourier(isCourierUser(user));
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady && !isCourier) {
      router.replace("/account");
    }
  }, [isReady, isCourier, router]);

  if (!isReady || !isCourier) {
    return (
      <section className="account-page">
        <div className="account-card">
          <h1>Проверяем доступ...</h1>
        </div>
      </section>
    );
  }

  return <ComponentCourierOrders />;
}
