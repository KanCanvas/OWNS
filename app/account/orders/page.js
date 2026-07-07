"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ComponentAdminOrders from "../../features/admin/orders/ComponentAdminOrders";
import { getStoredUser } from "../../../lib/auth-storage";

function isAdminUser(user) {
  if (!user) return false;
  if (user.isAdmin) return true;

  const adminPhone = String(process.env.NEXT_PUBLIC_ADMIN_PHONE || "").replace(
    /\D/g,
    ""
  );
  const userPhone = String(user.phone || "").replace(/\D/g, "");

  return adminPhone.length > 0 && userPhone === adminPhone;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    setIsAdmin(isAdminUser(user));
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady && !isAdmin) {
      router.replace("/account");
    }
  }, [isReady, isAdmin, router]);

  if (!isReady || !isAdmin) {
    return (
      <section className="account-page">
        <div className="account-card">
          <h1>Проверяем доступ...</h1>
        </div>
      </section>
    );
  }

  return <ComponentAdminOrders />;
}
