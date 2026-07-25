import { createHmac, timingSafeEqual } from "node:crypto";

export type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "semiannually"
  | "yearly";

export interface NotificationPreferences {
  enabled?: boolean;
  dailyTime?: string;
  timezone?: string;
  devices?: Record<string, { token?: string; userAgent?: string }>;
}

export interface DueTask {
  id: string;
  title: string;
  description?: string;
  slot?: string;
  assignedDate?: string | null;
  scheduledDate?: string | null;
  deadline?: string | null;
  completed?: boolean;
  notifyOnDeadline?: boolean;
  notifyOnScheduledDate?: boolean;
  lastNotificationSentFor?: Record<string, string> | null;
  recurrence?: RecurrenceFrequency | null;
}

export type DueReason = "deadline" | "scheduled";

export interface DueNotification {
  item: DueTask;
  reasons: DueReason[];
}

export function localDateTimeParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${lookup.year}-${lookup.month}-${lookup.day}`,
    minutes: Number(lookup.hour) * 60 + Number(lookup.minute),
  };
}

export function shouldRunForPreference(
  now: Date,
  preferences: NotificationPreferences,
  windowMinutes = 15
) {
  if (!preferences.enabled) return false;
  const dailyTime = preferences.dailyTime || "09:00";
  const timezone = preferences.timezone || "UTC";
  const [hour, minute] = dailyTime.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;

  const current = localDateTimeParts(now, timezone);
  const targetMinutes = hour * 60 + minute;
  const diff = current.minutes - targetMinutes;
  return diff >= 0 && diff < windowMinutes;
}

export function dueNotificationsForDate(items: DueTask[], today: string): DueNotification[] {
  return items
    .filter((item) => !item.completed)
    .map((item) => {
      const reasons: DueReason[] = [];
      const sent = item.lastNotificationSentFor || {};

      if (
        item.notifyOnDeadline &&
        item.deadline &&
        item.deadline <= today &&
        sent.deadline !== item.deadline
      ) {
        reasons.push("deadline");
      }

      if (
        item.notifyOnScheduledDate &&
        item.scheduledDate &&
        item.scheduledDate <= today &&
        sent.scheduled !== item.scheduledDate
      ) {
        reasons.push("scheduled");
      }

      return { item, reasons };
    })
    .filter((notification) => notification.reasons.length > 0);
}

export function sentUpdateFor(notification: DueNotification) {
  const update: Record<string, string> = {};
  if (notification.reasons.includes("deadline") && notification.item.deadline) {
    update.deadline = notification.item.deadline;
  }
  if (notification.reasons.includes("scheduled") && notification.item.scheduledDate) {
    update.scheduled = notification.item.scheduledDate;
  }
  return update;
}

export function getNextScheduledDate(fromDate: string, frequency: RecurrenceFrequency): string {
  const date = new Date(fromDate + "T00:00:00");
  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "semiannually":
      date.setMonth(date.getMonth() + 6);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().slice(0, 10);
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signPayload(payload: string, secret: string) {
  return base64Url(createHmac("sha256", secret).update(payload).digest());
}

export function createActionToken(
  payload: { uid: string; taskId: string; exp: number },
  secret: string
) {
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

export function verifyActionToken(token: string, secret: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new Error("Malformed token");

  const expected = signPayload(encodedPayload, secret);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
    uid: string;
    taskId: string;
    exp: number;
  };
  if (!payload.uid || !payload.taskId || Date.now() / 1000 > payload.exp) {
    throw new Error("Expired token");
  }
  return payload;
}
