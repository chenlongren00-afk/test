import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "@/api/client";
import { notificationRouteData, notificationRouteHref } from "@/services/notification-routing";
import type { NotificationItem } from "@/types/marketplace";

type NotificationRouter = {
  push: (href: string) => void;
};

const shownLocalNotificationIds = new Set<string>();
const ANDROID_NOTIFICATION_CHANNEL_ID = "task-alerts";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function registerPushNotifications(token: string | null) {
  const result = await diagnosePushRegistration(token);
  return result.ok ? result.pushToken || null : null;
}

export function addPushTokenRefreshListener(token: string | null) {
  if (!["android", "ios"].includes(Platform.OS) || !token) {
    return { remove() {} };
  }
  return Notifications.addPushTokenListener((pushToken) => {
    const tokenValue = typeof pushToken === "string" ? pushToken : pushToken.data;
    if (!tokenValue) return;
    void api.registerPushToken(token, {
      token: tokenValue,
      platform: Platform.OS,
      environment: "production",
      bundleId: "com.australianhelper.app",
      appVersion: Constants.expoConfig?.version || ""
    }).catch((error) => {
      console.warn("[push] Android rolled push token registration failed.", error);
    });
  });
}

export type PushRegistrationDiagnostics = {
  ok: boolean;
  platform: string;
  isDevice: boolean;
  permissionStatus: string;
  projectId: string;
  pushTokenSuffix: string;
  expoPushCredentialStatus?: string;
  expoPushCredentialMessage?: string;
  pushToken?: string;
  error?: string;
};

export async function diagnoseAndroidPushRegistration(token: string | null): Promise<PushRegistrationDiagnostics> {
  return diagnosePushRegistration(token);
}

export async function diagnosePushRegistration(token: string | null): Promise<PushRegistrationDiagnostics> {
  const base = {
    ok: false,
    platform: Platform.OS,
    isDevice: Device.isDevice,
    permissionStatus: "unknown",
    projectId: "",
    pushTokenSuffix: "",
    expoPushCredentialStatus: "",
    expoPushCredentialMessage: "",
    pushToken: ""
  };
  if (!token) return { ...base, error: "Login token is missing." };
  if (!["android", "ios"].includes(Platform.OS)) return { ...base, error: "Push notifications require iOS or Android." };
  if (!Device.isDevice) return { ...base, error: "Push notifications require a physical device." };

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
      name: "Task alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0F756D",
      sound: "default",
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;
  if (finalStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }
  base.permissionStatus = finalStatus;
  if (finalStatus !== "granted") {
    return { ...base, error: `Notification permission is ${finalStatus}.` };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  base.projectId = projectId || "";
  if (!projectId) {
    console.warn("[push] Expo project ID is missing; push token was not registered.");
    return { ...base, error: "Expo project ID is missing." };
  }

  try {
    const expoPushToken = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = expoPushToken.data;
    await api.registerPushToken(token, {
      token: pushToken,
      platform: Platform.OS,
      environment: "production",
      bundleId: "com.australianhelper.app",
      appVersion: Constants.expoConfig?.version || ""
    }).then((registration) => {
      base.expoPushCredentialStatus = registration.expoPushCredentialStatus || "";
      base.expoPushCredentialMessage = registration.expoPushCredentialMessage || "";
    });
    console.info(`[push] ${Platform.OS} push token registered (${pushToken.slice(-8)}).`);
    return { ...base, ok: true, pushToken, pushTokenSuffix: pushToken.slice(-8), projectId };
  } catch (error) {
    console.warn("[push] Push token registration failed.", error);
    return {
      ...base,
      projectId,
      error: error instanceof Error ? error.message : "Push token registration failed."
    };
  }
}

export function addNotificationResponseListener(router: NotificationRouter) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    openNotificationData(router, response.notification.request.content.data || {});
  });
}

export async function openLastNotificationResponse(router: NotificationRouter) {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    openNotificationData(router, response.notification.request.content.data || {});
  }
}

function openNotificationData(router: NotificationRouter, data: Record<string, unknown>) {
  router.push(notificationRouteHref(notificationRouteData(data)));
}

export function notificationToExpoData(notification: NotificationItem) {
  return {
    notificationId: notification.id,
    type: notification.type,
    relatedTaskId: notification.relatedTaskId || "",
    relatedOfferId: notification.relatedOfferId || "",
    route: notification.route || ""
  };
}

export async function showLocalNotification(notification: NotificationItem) {
  if (!["android", "ios"].includes(Platform.OS)) return;
  if (!notification.id || shownLocalNotificationIds.has(notification.id)) return;
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== "granted") return;
  shownLocalNotificationIds.add(notification.id);
  const trigger = Platform.OS === "android"
    ? { channelId: ANDROID_NOTIFICATION_CHANNEL_ID, seconds: 1 }
    : null;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title || "Australian Helper",
      body: notification.body || "",
      data: notificationToExpoData(notification),
      sound: "default"
    },
    trigger
  });
}

export async function showAndroidLocalNotification(notification: NotificationItem) {
  return showLocalNotification(notification);
}
