"use client";

import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { User } from "firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import { NotificationPreferences } from "@/lib/types";

const DEVICE_ID_KEY = "todoblake-notification-device-id";
const DEFAULT_REGION = "us-central1";

export function getDefaultNotificationPreferences(): Pick<
  NotificationPreferences,
  "enabled" | "dailyTime" | "timezone"
> {
  return {
    enabled: false,
    dailyTime: "09:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

export function notificationPreferencesRef(uid: string) {
  return doc(getFirebaseDb(), "users", uid, "notificationPreferences", "default");
}

export function subscribeToNotificationPreferences(
  uid: string,
  onChange: (preferences: Pick<NotificationPreferences, "enabled" | "dailyTime" | "timezone">) => void
) {
  return onSnapshot(notificationPreferencesRef(uid), (snapshot) => {
    onChange({
      ...getDefaultNotificationPreferences(),
      ...snapshot.data(),
    });
  });
}

export async function browserSupportsPushNotifications() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    (await isSupported())
  );
}

export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "default" as NotificationPermission;
  }
  return Notification.permission;
}

export function getDeviceId() {
  let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function functionsBaseUrl() {
  if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE_URL) {
    return process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE_URL.replace(/\/$/, "");
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || DEFAULT_REGION;
  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  }
  return `https://${region}-${projectId}.cloudfunctions.net`;
}

async function postToFunction(
  name: "registerNotificationDevice" | "unregisterNotificationDevice" | "sendTestNotification",
  user: User,
  body: Record<string, unknown>
) {
  const idToken = await user.getIdToken();
  const response = await fetch(`${functionsBaseUrl()}/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function registerNotificationDevice(user: User) {
  const permission =
    getNotificationPermission() === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notifications permission was not granted.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  const messaging = getMessaging();
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("Firebase did not return a notification token.");
  }

  await postToFunction("registerNotificationDevice", user, {
    deviceId: getDeviceId(),
    token,
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
}

export async function unregisterNotificationDevice(user: User) {
  const messaging = getMessaging();
  await deleteToken(messaging).catch(() => undefined);
  await postToFunction("unregisterNotificationDevice", user, {
    deviceId: getDeviceId(),
  });
}

export async function sendTestNotification(user: User) {
  await postToFunction("sendTestNotification", user, {});
}
