import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  createActionToken,
  DueTask,
  dueNotificationsForDate,
  getNextScheduledDate,
  localDateTimeParts,
  NotificationPreferences,
  sentUpdateFor,
  shouldRunForPreference,
  verifyActionToken,
} from "./notification-core.js";

initializeApp();

const db = getFirestore();
const DEFAULT_REGION = "us-central1";
const ACTION_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const ACTION_SECRET = defineSecret("NOTIFICATION_ACTION_SECRET");
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

async function assertApprovedUid(uid: string) {
  const access = await db.doc(`access/${uid}`).get();
  if (!access.exists) throw new Error("This account is not approved for this app");
}

function boundedString(
  value: unknown,
  name: string,
  maxLength: number,
  required = false
) {
  if (typeof value !== "string" || (required && value.length === 0)) {
    if (required) throw new Error(`Missing ${name}`);
    return "";
  }
  if (value.length > maxLength) throw new Error(`${name} is too long`);
  return value;
}

function cors(response: {
  set: (name: string, value: string) => void;
}) {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
}

async function uidFromRequest(request: { get: (name: string) => string | undefined }) {
  const authHeader = request.get("authorization") || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) throw new Error("Missing bearer token");
  const decoded = await getAuth().verifyIdToken(match[1]);
  return decoded.uid;
}

function actionSecret() {
  const secret = ACTION_SECRET.value();
  if (!secret) throw new Error("Missing NOTIFICATION_ACTION_SECRET");
  return secret;
}

function completionUrl() {
  if (process.env.NOTIFICATION_COMPLETE_URL) return process.env.NOTIFICATION_COMPLETE_URL;
  const firebaseConfig = process.env.FIREBASE_CONFIG
    ? (JSON.parse(process.env.FIREBASE_CONFIG) as { projectId?: string })
    : {};
  const projectId =
    process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || firebaseConfig.projectId;
  return projectId
    ? `https://${DEFAULT_REGION}-${projectId}.cloudfunctions.net/completeTaskFromNotification`
    : "";
}

export const registerNotificationDevice = onRequest(
  { region: DEFAULT_REGION },
  async (request, response) => {
    cors(response);
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed");
      return;
    }

    try {
      const uid = await uidFromRequest(request);
      await assertApprovedUid(uid);
      const { deviceId, token, userAgent, timezone } = request.body || {};
      const safeDeviceId = boundedString(deviceId, "deviceId", 128, true);
      const safeToken = boundedString(token, "token", 4096, true);
      const safeUserAgent = boundedString(userAgent, "userAgent", 512);
      const safeTimezone = boundedString(timezone, "timezone", 100) || "UTC";
      if (!DEVICE_ID_PATTERN.test(safeDeviceId)) throw new Error("Invalid deviceId");

      await db.doc(`users/${uid}/notificationPreferences/default`).set(
        {
          enabled: true,
          dailyTime: "09:00",
          timezone: safeTimezone,
          [`devices.${safeDeviceId}`]: {
            token: safeToken,
            userAgent: safeUserAgent,
            createdAt: FieldValue.serverTimestamp(),
            lastSeenAt: FieldValue.serverTimestamp(),
          },
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logger.info("Registered notification device", {
        uid,
        deviceId: safeDeviceId,
        timezone: safeTimezone,
        userAgentLength: safeUserAgent.length,
      });
      response.json({ ok: true });
    } catch (error) {
      logger.warn("Failed to register notification device", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      response.status(401).send(error instanceof Error ? error.message : "Unauthorized");
    }
  }
);

export const unregisterNotificationDevice = onRequest(
  { region: DEFAULT_REGION },
  async (request, response) => {
    cors(response);
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed");
      return;
    }

    try {
      const uid = await uidFromRequest(request);
      await assertApprovedUid(uid);
      const { deviceId } = request.body || {};
      const safeDeviceId = boundedString(deviceId, "deviceId", 128, true);
      if (!DEVICE_ID_PATTERN.test(safeDeviceId)) throw new Error("Invalid deviceId");

      await db.doc(`users/${uid}/notificationPreferences/default`).set(
        {
          [`devices.${safeDeviceId}`]: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logger.info("Unregistered notification device", {
        uid,
        deviceId: safeDeviceId,
      });
      response.json({ ok: true });
    } catch (error) {
      logger.warn("Failed to unregister notification device", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      response.status(401).send(error instanceof Error ? error.message : "Unauthorized");
    }
  }
);

export const sendTestNotification = onRequest(
  { region: DEFAULT_REGION },
  async (request, response) => {
    cors(response);
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed");
      return;
    }

    try {
      const uid = await uidFromRequest(request);
      await assertApprovedUid(uid);
      const prefRef = db.doc(`users/${uid}/notificationPreferences/default`);
      const prefSnap = await prefRef.get();
      const preferences = (prefSnap.data() || {}) as NotificationPreferences;
      const deviceEntries = Object.entries(preferences.devices || {}).filter(
        ([, device]) => Boolean(device?.token)
      );

      logger.info("Sending test notification", {
        uid,
        enabled: preferences.enabled ?? false,
        deviceCount: deviceEntries.length,
      });

      if (deviceEntries.length === 0) {
        response.status(400).send("No registered notification devices.");
        return;
      }

      const results = await Promise.allSettled(
        deviceEntries.map(async ([deviceId, device]) => {
          try {
            await getMessaging().send({
              token: device.token!,
              webpush: {
                notification: {
                  title: "TodoBlake test",
                  body: "Push notifications are working.",
                  icon: "/icons/icon-192x192.png",
                },
              },
              data: {
                title: "TodoBlake test",
                body: "Push notifications are working.",
                openUrl: "/today",
              },
            });
            logger.info("Sent test notification", { uid, deviceId });
          } catch (error) {
            logger.warn("Failed to send test notification", {
              uid,
              deviceId,
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown FCM send error",
            });
            await prefRef.update({
              [`devices.${deviceId}`]: FieldValue.delete(),
              updatedAt: FieldValue.serverTimestamp(),
            });
            throw error;
          }
        })
      );

      const sentCount = results.filter((result) => result.status === "fulfilled").length;
      if (sentCount === 0) {
        response.status(502).send("No registered devices accepted the test notification.");
        return;
      }

      response.json({ ok: true, sentCount });
    } catch (error) {
      logger.warn("Failed to send test notification", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      response.status(401).send(error instanceof Error ? error.message : "Unauthorized");
    }
  }
);

export const completeTaskFromNotification = onRequest(
  { region: DEFAULT_REGION, secrets: [ACTION_SECRET] },
  async (request, response) => {
    cors(response);
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed");
      return;
    }

    try {
      const { token } = request.body || {};
      const payload = verifyActionToken(
        boundedString(token, "token", 4096, true),
        actionSecret()
      );
      await assertApprovedUid(payload.uid);
      const itemRef = db.doc(`users/${payload.uid}/todoItems/${payload.taskId}`);
      const itemSnap = await itemRef.get();
      if (!itemSnap.exists) {
        response.status(404).send("Task not found");
        return;
      }

      const item = itemSnap.data() || {};
      if (!item.completed) {
        await itemRef.update({
          completed: true,
          completedAt: FieldValue.serverTimestamp(),
          notificationCompletedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        if (item.recurrence) {
          await db.collection(`users/${payload.uid}/todoItems`).add({
            title: item.title,
            description: item.description || "",
            slot: "backlog",
            assignedDate: null,
            scheduledDate: getNextScheduledDate(
              item.scheduledDate || new Date().toISOString().slice(0, 10),
              item.recurrence
            ),
            deadline: null,
            completed: false,
            completedAt: null,
            notifyOnDeadline: item.notifyOnDeadline ?? false,
            notifyOnScheduledDate: item.notifyOnScheduledDate ?? false,
            lastNotificationSentFor: null,
            notificationCompletedAt: null,
            recurrence: item.recurrence,
            sortOrder: Date.now(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      response.json({ ok: true });
    } catch (error) {
      response.status(400).send(error instanceof Error ? error.message : "Invalid token");
    }
  }
);

export const sendDueTaskNotifications = onSchedule(
  {
    region: DEFAULT_REGION,
    schedule: "every 15 minutes",
    timeZone: "UTC",
    secrets: [ACTION_SECRET],
  },
  async () => {
    const now = new Date();
    // Iterate the small, administrator-managed allowlist rather than every
    // account that has ever authenticated.
    const usersSnap = await db.collection("access").get();
    logger.info("Starting due task notification sweep", {
      accessUserCount: usersSnap.size,
      now: now.toISOString(),
    });

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const prefRef = db.doc(`users/${uid}/notificationPreferences/default`);
      const prefSnap = await prefRef.get();
      const preferences = (prefSnap.data() || {}) as NotificationPreferences;
      const timezone = preferences.timezone || "UTC";
      const localNow = localDateTimeParts(now, timezone);
      const shouldRun = shouldRunForPreference(now, preferences, 30);

      const deviceEntries = Object.entries(preferences.devices || {}).filter(
        ([, device]) => Boolean(device?.token)
      );
      logger.info("Evaluating notification user", {
        uid,
        enabled: preferences.enabled ?? false,
        dailyTime: preferences.dailyTime || "09:00",
        timezone,
        localDate: localNow.date,
        localMinutes: localNow.minutes,
        shouldRun,
        deviceCount: deviceEntries.length,
      });

      if (!shouldRun) continue;
      if (deviceEntries.length === 0) {
        logger.info("Skipping notification user with no registered devices", {
          uid,
        });
        continue;
      }

      const today = localNow.date;
      const itemsSnap = await db
        .collection(`users/${uid}/todoItems`)
        .where("completed", "==", false)
        .get();
      const notifications = dueNotificationsForDate(
        itemsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as DueTask),
        today
      );
      logger.info("Resolved due task notifications", {
        uid,
        activeTaskCount: itemsSnap.size,
        dueNotificationCount: notifications.length,
        dueTasks: notifications.map((notification) => ({
          taskId: notification.item.id,
          reasons: notification.reasons,
          deadline: notification.item.deadline || null,
          scheduledDate: notification.item.scheduledDate || null,
        })),
      });

      for (const notification of notifications) {
        const openUrl =
          notification.item.assignedDate === today
            ? "/today"
            : notification.item.slot === "backlog"
              ? "/backlog"
              : "/today";
        const token = createActionToken(
          {
            uid,
            taskId: notification.item.id,
            exp: Math.floor(Date.now() / 1000) + ACTION_TOKEN_TTL_SECONDS,
          },
          actionSecret()
        );
        const body =
          notification.reasons.length > 1
            ? "This task is scheduled and has reached its deadline."
            : notification.reasons[0] === "deadline"
              ? "This task has reached its deadline."
              : "This scheduled task is ready.";

        const results = await Promise.allSettled(
          deviceEntries.map(async ([deviceId, device]) => {
            try {
              await getMessaging().send({
                token: device.token!,
                webpush: {
                  notification: {
                    title: notification.item.title,
                    body,
                    icon: "/icons/icon-192x192.png",
                  },
                },
                data: {
                  title: notification.item.title,
                  body,
                  taskId: notification.item.id,
                  actionToken: token,
                  completeUrl: completionUrl(),
                  openUrl,
                },
              });
              logger.info("Sent due task notification", {
                uid,
                deviceId,
                taskId: notification.item.id,
                reasons: notification.reasons,
              });
            } catch (error) {
              logger.warn("Failed to send due task notification", {
                uid,
                deviceId,
                taskId: notification.item.id,
                error:
                  error instanceof Error
                    ? error.message
                    : "Unknown FCM send error",
              });
              await prefRef.update({
                [`devices.${deviceId}`]: FieldValue.delete(),
                updatedAt: FieldValue.serverTimestamp(),
              });
              throw error;
            }
          })
        );

        if (results.some((result) => result.status === "fulfilled")) {
          const sentUpdate = sentUpdateFor(notification);
          await db.doc(`users/${uid}/todoItems/${notification.item.id}`).update({
            lastNotificationSentFor: {
              ...(notification.item.lastNotificationSentFor || {}),
              ...sentUpdate,
            },
            lastNotificationSentAt: Timestamp.now(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          logger.info("Marked due task notification as sent", {
            uid,
            taskId: notification.item.id,
            sentUpdate,
          });
        } else {
          logger.warn("No devices accepted due task notification", {
            uid,
            taskId: notification.item.id,
            reasons: notification.reasons,
          });
        }
      }
    }
  }
);
