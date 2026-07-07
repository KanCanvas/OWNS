"use client";

export const AUTH_CHANGE_EVENT = "ownpizza-auth-change";

export function getStoredUser() {
  if (typeof window === "undefined") return null;

  try {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || !rawUser) return null;

    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function saveAuthSession({ token, user }) {
  if (typeof window === "undefined") return;

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}
