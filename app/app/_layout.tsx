import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, useSegments } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { AppState } from "react-native";

import { LoginGate } from "@/components/LoginGate";
import { SplashOverlay } from "@/components/SplashOverlay";
import { addNotificationResponseListener, addPushTokenRefreshListener, openLastNotificationResponse, registerPushNotifications, showLocalNotification } from "@/services/push-notifications";
import { AppProvider, useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 3
    }
  }
});

export default function RootLayout() {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <RootNavigator showSplash={showSplash} />
        {showSplash ? <SplashOverlay onDone={() => setShowSplash(false)} /> : null}
      </AppProvider>
    </QueryClientProvider>
  );
}

function RootNavigator({ showSplash }: { showSplash: boolean }) {
  const store = useAppStore();
  const router = useRouter();
  const segments = useSegments();
  const seenNotificationIdsRef = React.useRef<Set<string> | null>(null);
  const isAuthenticated = store.isAuthenticated;
  const notifications = store.state.notifications;
  const silentRefreshAll = store.silentRefreshAll;
  const token = store.token;
  const isAuthCallback = segments[0] === "oauth";
  const isPublicAuthRoute = isAuthCallback || segments[0] === "forgot-password" || segments[0] === "reset-password";
  const shouldShowLogin = !isPublicAuthRoute && !showSplash && !store.isLoading && !isAuthenticated;

  React.useEffect(() => {
    if (isPublicAuthRoute && isAuthenticated && !store.isLoading) {
      router.replace("/");
    }
  }, [isPublicAuthRoute, isAuthenticated, router, store.isLoading]);

  React.useEffect(() => {
    if (!isAuthenticated || !token) return undefined;
    let pushRegistered = false;
    const registerPush = async () => {
      if (pushRegistered) return;
      const pushToken = await registerPushNotifications(token).catch(() => null);
      if (pushToken) pushRegistered = true;
    };
    void registerPush();
    const retryTimer = setInterval(() => {
      void registerPush();
    }, 30000);
    const pushTokenSubscription = addPushTokenRefreshListener(token);
    const subscription = addNotificationResponseListener(router);
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void registerPush();
    });
    void openLastNotificationResponse(router).catch(() => null);
    return () => {
      clearInterval(retryTimer);
      pushTokenSubscription.remove();
      subscription.remove();
      appStateSubscription.remove();
    };
  }, [isAuthenticated, router, token]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      seenNotificationIdsRef.current = null;
      return;
    }
    const currentNotifications = notifications || [];
    if (seenNotificationIdsRef.current === null) {
      seenNotificationIdsRef.current = new Set(currentNotifications.map((item) => item.id));
      return;
    }
    const seenIds = seenNotificationIdsRef.current;
    for (const notification of currentNotifications) {
      if (!notification.id || seenIds.has(notification.id)) continue;
      seenIds.add(notification.id);
      if (notification.read || isSelfConfirmationNotification(notification) || AppState.currentState === "active") continue;
      void showLocalNotification(notification).catch(() => null);
    }
  }, [isAuthenticated, notifications]);

  React.useEffect(() => {
    if (!isAuthenticated || !token) return undefined;
    const refreshMarketplace = () => {
      if (AppState.currentState === "active") void silentRefreshAll();
    };
    const timer = setInterval(refreshMarketplace, 60000);
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") refreshMarketplace();
    });
    return () => {
      clearInterval(timer);
      appStateSubscription.remove();
    };
  }, [isAuthenticated, silentRefreshAll, token]);

  if (shouldShowLogin) {
    return (
      <>
        <StatusBar style="light" />
        <LoginGate />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "900" }
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="oauth" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ title: store.translate("forgotPassword") }} />
        <Stack.Screen name="reset-password" options={{ title: store.translate("resetPassword") }} />
        <Stack.Screen name="task/[id]" options={{ title: store.translate("taskDetail"), presentation: "modal" }} />
        <Stack.Screen name="thread/[id]" options={{ title: store.translate("taskChat") }} />
        <Stack.Screen name="settings" options={{ title: store.translate("settings") }} />
        <Stack.Screen name="notifications" options={{ title: store.translate("actionCentre") }} />
        <Stack.Screen name="categories" options={{ title: store.translate("categories") }} />
        <Stack.Screen name="my-posted-tasks" options={{ title: store.translate("myPostedTasks") }} />
        <Stack.Screen name="my-accepted-tasks" options={{ title: store.translate("myAcceptedTasks") }} />
        <Stack.Screen name="tasks-applied" options={{ title: store.translate("tasksApplied") }} />
        <Stack.Screen name="earnings" options={{ title: store.translate("earnings") }} />
        <Stack.Screen name="payment" options={{ title: store.translate("payment") }} />
        <Stack.Screen name="payment-return" options={{ title: store.translate("payment") }} />
        <Stack.Screen name="payment-cancel" options={{ title: store.translate("payment") }} />
        <Stack.Screen name="payout" options={{ title: store.translate("payout") }} />
        <Stack.Screen name="about" options={{ title: store.translate("about") }} />
        <Stack.Screen name="help" options={{ title: store.translate("helpSupport") }} />
        <Stack.Screen name="terms" options={{ title: store.translate("terms") }} />
        <Stack.Screen name="privacy" options={{ title: store.translate("privacy") }} />
        <Stack.Screen name="pro" options={{ title: store.translate("proUpgrade") }} />
        <Stack.Screen name="ratings" options={{ title: store.translate("ratingsReviews") }} />
        <Stack.Screen name="rewards" options={{ title: store.translate("rewards") }} />
        <Stack.Screen name="referral" options={{ title: store.translate("referral") }} />
        <Stack.Screen name="trust-safety" options={{ title: store.translate("trustSafety") }} />
        <Stack.Screen name="how-it-works" options={{ title: store.translate("howItWorks") }} />
        <Stack.Screen name="become-helper" options={{ title: store.translate("becomeHelper") }} />
        <Stack.Screen name="feedback" options={{ title: store.translate("feedback") }} />
        <Stack.Screen name="compliance" options={{ title: store.translate("compliance") }} />
        <Stack.Screen name="sme" options={{ title: store.translate("smePortal") }} />
        <Stack.Screen name="profile-edit" options={{ title: store.translate("profileEdit") }} />
        <Stack.Screen name="account-sync" options={{ title: store.translate("accountSync") }} />
        <Stack.Screen name="cancellation-policy" options={{ title: store.translate("cancellationPolicy") }} />
        <Stack.Screen name="cancellation-request" options={{ title: store.translate("cancellationRequest") }} />
        <Stack.Screen name="refund-request" options={{ title: store.translate("refundRequest") }} />
        <Stack.Screen name="cost-guides" options={{ title: store.translate("costGuides") }} />
        <Stack.Screen name="tasker-completed-tasks" options={{ title: store.translate("taskerCompletedTasks") }} />
        <Stack.Screen name="helper-completed-tasks" options={{ title: store.translate("helperCompletedTasks") }} />
        <Stack.Screen name="notification-demo" options={{ title: store.translate("notificationDemo") }} />
        <Stack.Screen name="helper-profile" options={{ headerShown: false, title: store.translate("helperProfile") }} />
      </Stack>
    </>
  );
}

function isSelfConfirmationNotification(notification: { title?: string; type?: string }) {
  const value = `${notification.type || ""} ${notification.title || ""}`.toLowerCase();
  return value.includes("sent") && (value.includes("offer") || value.includes("message"));
}
