import * as React from "react";
import { Platform } from "react-native";

import { ParityScreen, StatRow } from "@/components/ParityScreen";
import { Card, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

const NativeGooglePlayProPanel = Platform.OS === "android"
  ? React.lazy(async () => {
      const module = await import("@/components/NativeGooglePlayProPanel");
      return { default: module.NativeGooglePlayProPanel };
    })
  : null;

export default function ProRoute() {
  const store = useAppStore();
  const isActive = store.currentUser?.membershipType === "pro" || store.currentUser?.proStatus === "active";
  const billingAvailable = Platform.OS === "android";
  const activeMessage = store.currentUser?.subscriptionProvider === "google_play"
    ? store.translate("googlePlayProActive")
    : store.translate("proActive");

  return (
    <ParityScreen titleKey="proUpgrade">
      <Card>
        <StatRow label={store.translate("status")} value={store.currentUser?.proStatus || store.currentUser?.membershipType || store.translate("standard")} />
        <StatRow label={store.translate("subscriptionProvider")} value={store.currentUser?.subscriptionProvider || "none"} />
        {store.currentUser?.subscriptionRenewsAt ? (
          <StatRow label={store.translate("renewsAt")} value={new Date(store.currentUser.subscriptionRenewsAt).toLocaleDateString()} />
        ) : null}
        <StatusBanner
          tone={isActive ? "success" : billingAvailable ? "info" : "error"}
          message={isActive ? activeMessage : billingAvailable ? store.translate("googlePlayBillingBody") : store.translate("googlePlayBillingUnavailable")}
        />
      </Card>

      {NativeGooglePlayProPanel ? (
        <React.Suspense fallback={<StatusBanner message={store.translate("googlePlayProductsLoading")} />}>
          <NativeGooglePlayProPanel isActive={isActive} />
        </React.Suspense>
      ) : null}
    </ParityScreen>
  );
}
