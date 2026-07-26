import { describe, expect, it } from "vitest";
import {
  createActionToken,
  dueNotificationsForDate,
  sentUpdateFor,
  shouldRunForPreference,
  verifyActionToken,
} from "./notification-core.js";

describe("dueNotificationsForDate", () => {
  it("selects deadline and scheduled notifications that are due", () => {
    const notifications = dueNotificationsForDate(
      [
        {
          id: "deadline",
          title: "Deadline",
          completed: false,
          deadline: "2026-07-24",
          notifyOnDeadline: true,
        },
        {
          id: "scheduled",
          title: "Scheduled",
          completed: false,
          scheduledDate: "2026-07-23",
          notifyOnScheduledDate: true,
        },
      ],
      "2026-07-24"
    );

    expect(notifications.map((item) => item.item.id)).toEqual(["deadline", "scheduled"]);
    expect(sentUpdateFor(notifications[0])).toEqual({ deadline: "2026-07-24" });
    expect(sentUpdateFor(notifications[1])).toEqual({ scheduled: "2026-07-23" });
  });

  it("skips completed, future, disabled, and already-sent tasks", () => {
    const notifications = dueNotificationsForDate(
      [
        {
          id: "completed",
          title: "Completed",
          completed: true,
          deadline: "2026-07-24",
          notifyOnDeadline: true,
        },
        {
          id: "future",
          title: "Future",
          completed: false,
          deadline: "2026-07-25",
          notifyOnDeadline: true,
        },
        {
          id: "disabled",
          title: "Disabled",
          completed: false,
          scheduledDate: "2026-07-24",
          notifyOnScheduledDate: false,
        },
        {
          id: "sent",
          title: "Sent",
          completed: false,
          deadline: "2026-07-24",
          notifyOnDeadline: true,
          lastNotificationSentFor: { deadline: "2026-07-24" },
        },
      ],
      "2026-07-24"
    );

    expect(notifications).toEqual([]);
  });

  it("combines deadline and scheduled reasons for the same task", () => {
    const [notification] = dueNotificationsForDate(
      [
        {
          id: "both",
          title: "Both",
          completed: false,
          deadline: "2026-07-24",
          scheduledDate: "2026-07-24",
          notifyOnDeadline: true,
          notifyOnScheduledDate: true,
        },
      ],
      "2026-07-24"
    );

    expect(notification.reasons).toEqual(["deadline", "scheduled"]);
    expect(sentUpdateFor(notification)).toEqual({
      deadline: "2026-07-24",
      scheduled: "2026-07-24",
    });
  });
});

describe("shouldRunForPreference", () => {
  it("runs inside the user's local notification window", () => {
    expect(
      shouldRunForPreference(new Date("2026-07-24T14:05:00.000Z"), {
        enabled: true,
        dailyTime: "09:00",
        timezone: "America/Chicago",
      })
    ).toBe(true);
  });

  it("does not run outside the notification window or when disabled", () => {
    expect(
      shouldRunForPreference(new Date("2026-07-24T14:20:00.000Z"), {
        enabled: true,
        dailyTime: "09:00",
        timezone: "America/Chicago",
      })
    ).toBe(false);
    expect(
      shouldRunForPreference(new Date("2026-07-24T14:05:00.000Z"), {
        enabled: false,
        dailyTime: "09:00",
        timezone: "America/Chicago",
      })
    ).toBe(false);
  });

  it("supports a wider scheduler window to tolerate delayed invocations", () => {
    expect(
      shouldRunForPreference(
        new Date("2026-07-24T14:20:00.000Z"),
        {
          enabled: true,
          dailyTime: "09:00",
          timezone: "America/Chicago",
        },
        30
      )
    ).toBe(true);
  });
});

describe("notification action tokens", () => {
  it("verifies signed completion tokens", () => {
    const token = createActionToken(
      { uid: "user-1", taskId: "task-1", exp: Math.floor(Date.now() / 1000) + 60 },
      "secret"
    );

    expect(verifyActionToken(token, "secret")).toMatchObject({
      uid: "user-1",
      taskId: "task-1",
    });
  });

  it("rejects bad signatures and expired tokens", () => {
    const expired = createActionToken(
      { uid: "user-1", taskId: "task-1", exp: Math.floor(Date.now() / 1000) - 1 },
      "secret"
    );

    expect(() => verifyActionToken(expired, "secret")).toThrow("Expired token");
    expect(() => verifyActionToken(expired, "wrong-secret")).toThrow("Invalid token signature");
  });
});
