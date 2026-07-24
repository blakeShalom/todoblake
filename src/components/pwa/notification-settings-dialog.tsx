"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { saveNotificationPreferences } from "@/lib/firebase/firestore";
import {
  browserSupportsPushNotifications,
  getDefaultNotificationPreferences,
  getNotificationPermission,
  registerNotificationDevice,
  subscribeToNotificationPreferences,
  unregisterNotificationDevice,
} from "@/lib/firebase/notifications";

export function NotificationSettingsDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    getNotificationPermission()
  );
  const [enabled, setEnabled] = useState(false);
  const [dailyTime, setDailyTime] = useState("09:00");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    browserSupportsPushNotifications().then(setSupported);
  }, []);

  useEffect(() => {
    if (!user) return;
    return subscribeToNotificationPreferences(user.uid, (preferences) => {
      setEnabled(preferences.enabled);
      setDailyTime(preferences.dailyTime);
      setTimezone(preferences.timezone);
    });
  }, [user]);

  async function enableNotifications() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const defaults = getDefaultNotificationPreferences();
      await registerNotificationDevice(user);
      await saveNotificationPreferences(user.uid, {
        enabled: true,
        dailyTime: dailyTime || defaults.dailyTime,
        timezone: timezone || defaults.timezone,
      });
      setEnabled(true);
      setPermission(getNotificationPermission());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable notifications.");
    } finally {
      setSaving(false);
    }
  }

  async function disableNotifications() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await unregisterNotificationDevice(user);
      await saveNotificationPreferences(user.uid, {
        enabled: false,
        dailyTime,
        timezone,
      });
      setEnabled(false);
      setPermission(getNotificationPermission());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable notifications.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTime(nextTime: string) {
    if (!user) return;
    setDailyTime(nextTime);
    await saveNotificationPreferences(user.uid, {
      enabled,
      dailyTime: nextTime,
      timezone,
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        aria-label="Notification settings"
      >
        {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              iPhone push notifications require opening TodoBlake from the Home
              Screen after installing the PWA. Notification actions are used when
              the phone browser supports them; tapping always opens the app.
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Daily notification time
              </label>
              <Input
                type="time"
                value={dailyTime}
                onChange={(e) => saveTime(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Sent in {timezone || "your local timezone"}.
              </p>
            </div>

            {!supported && (
              <p className="text-sm text-destructive">
                This browser does not support web push notifications.
              </p>
            )}
            {permission === "denied" && (
              <p className="text-sm text-destructive">
                Notifications are blocked for this app in browser settings.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              {enabled ? (
                <Button type="button" variant="destructive" onClick={disableNotifications} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Disable
                </Button>
              ) : (
                <Button type="button" onClick={enableNotifications} disabled={!supported || saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enable
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
