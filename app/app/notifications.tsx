import { Bell, CheckCircle2, ChevronRight, CreditCard, MessageCircle, ShieldAlert, Star, Tag, WalletCards } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as React from "react";
import { Pressable, Text, View } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { notificationRouteHref } from "@/services/notification-routing";
import { AHButton, Card, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

export default function NotificationsRoute() {
  const store = useAppStore();
  const router = useRouter();
  const sortedNotifications = React.useMemo(() => (
    [...store.state.notifications].sort((left, right) => (
      actionPriority(right) - actionPriority(left) ||
      Number(!right.read) - Number(!left.read) ||
      String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
    ))
  ), [store.state.notifications]);
  const actionItems = sortedNotifications.filter((item) => !item.read && actionPriority(item) > 0);

  async function openNotification(item: (typeof store.state.notifications)[number]) {
    await store.openNotification(item);
    const href = notificationRouteHref(item);
    if (href) router.push(href);
  }

  function openFirstAction() {
    const item = actionItems[0];
    if (item) void openNotification(item);
  }

  return (
    <ParityScreen titleKey="actionCentre">
      <Pressable accessibilityRole="button" onPress={openFirstAction} disabled={!actionItems.length}>
        {({ pressed }) => (
          <View style={{ opacity: pressed ? 0.72 : 1 }}>
            <Card tone="warm">
              <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
                <CheckCircle2 color={colors.primary} size={22} strokeWidth={3} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
                    {store.translate("whatNeedsAction")}
                  </Text>
                  <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                    {actionItems.length ? `${actionItems.length} ${store.translate("actionsWaiting")}` : store.translate("noActionsWaiting")}
                  </Text>
                  {actionItems[0] ? (
                    <Text selectable numberOfLines={2} style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "900", lineHeight: 18 }}>
                      {localizedNotificationTitle(actionItems[0].title, store.translate)} · {localizedNotificationBody(actionItems[0].title, actionItems[0].body, store.translate)}
                    </Text>
                  ) : null}
                </View>
                <ChevronRight color={colors.primary} size={18} />
              </View>
            </Card>
          </View>
        )}
      </Pressable>
      {actionItems.length ? (
        <AHButton
          label={store.translate("markAllRead")}
          tone="secondary"
          onPress={() => {
            void store.markAllNotificationsRead();
          }}
        />
      ) : null}
      {actionItems.length ? (
        actionItems.map((item) => (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => void openNotification(item)}>
            {({ pressed }) => (
              <View style={{ opacity: pressed ? 0.72 : 1 }}>
                <Card>
                  <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
                    <ActionIcon item={item} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
                        {localizedNotificationTitle(item.title, store.translate)}
                      </Text>
                      <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>
                        {localizedNotificationBody(item.title, item.body, store.translate)}
                      </Text>
                      <View style={{ alignSelf: "flex-start", backgroundColor: item.read ? colors.surfaceAlt : colors.surfaceWarm, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text selectable style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>
                          {actionLabel(item, store.translate)}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight color={colors.muted} size={18} />
                  </View>
                </Card>
              </View>
            )}
          </Pressable>
        ))
      ) : (
        <StatusBanner message={store.translate("noActionsWaiting")} />
      )}
    </ParityScreen>
  );
}

function ActionIcon({ item }: { item: { type?: string; title?: string; body?: string; read?: boolean } }) {
  const normalized = `${item.type || ""} ${item.title || ""} ${item.body || ""}`.toLowerCase();
  const color = item.read ? colors.muted : colors.primary;
  if (normalized.includes("release")) return <WalletCards color={color} size={22} />;
  if (normalized.includes("payment") || normalized.includes("payout")) return <CreditCard color={color} size={22} />;
  if (normalized.includes("counter") || normalized.includes("offer")) return <Tag color={color} size={22} />;
  if (normalized.includes("message")) return <MessageCircle color={color} size={22} />;
  if (normalized.includes("review") || normalized.includes("rating")) return <Star color={color} size={22} />;
  if (normalized.includes("dispute") || normalized.includes("cancel") || normalized.includes("verification") || normalized.includes("approve")) return <ShieldAlert color={color} size={22} />;
  return <Bell color={color} size={22} />;
}

function actionPriority(item: { type?: string; title?: string; body?: string; read?: boolean }) {
  const normalized = `${item.type || ""} ${item.title || ""} ${item.body || ""}`.toLowerCase();
  if (normalized.includes("payment") || normalized.includes("release") || normalized.includes("payout")) return 6;
  if (normalized.includes("counter")) return 5;
  if (normalized.includes("offer")) return 4;
  if (normalized.includes("message")) return 3;
  if (normalized.includes("review") || normalized.includes("approve") || normalized.includes("verification")) return 2;
  return item.read ? 0 : 1;
}

function actionLabel(item: { type?: string; title?: string; body?: string }, translate: (key: string) => string) {
  const normalized = `${item.type || ""} ${item.title || ""} ${item.body || ""}`.toLowerCase();
  if (normalized.includes("release")) return translate("openReleaseAction");
  if (normalized.includes("payment") || normalized.includes("payout")) return translate("openPaymentAction");
  if (normalized.includes("counter")) return translate("openCounterAction");
  if (normalized.includes("offer")) return normalized.includes("received") ? translate("acceptOffer") : translate("openOfferAction");
  if (normalized.includes("message")) return translate("openMessageAction");
  if (normalized.includes("dispute") || normalized.includes("cancel")) return translate("openDisputeAction");
  if (normalized.includes("review") || normalized.includes("approve") || normalized.includes("verification")) return translate("openReviewAction");
  return translate("openDetails");
}

function localizedNotificationTitle(title: string, translate: (key: string) => string) {
  const normalized = title.trim().toLowerCase();
  const titleMap: Record<string, string> = {
    "task assigned": "notificationTaskAssigned",
    "task started": "notificationTaskStarted",
    "task completed": "notificationTaskCompleted",
    "task cancelled": "notificationTaskCancelled",
    "payment secured": "notificationPaymentSecured",
    "payment released": "notificationPaymentReleased",
    "payment requested": "notificationPaymentRequested",
    "offer received": "notificationOfferReceived",
    "offer sent": "notificationOfferSent",
    "message received": "notificationMessageReceived",
    "new message": "notificationMessageReceived",
    "review received": "notificationReviewReceived",
    "30 day pro free trial activated": "notificationProTrialActivated"
  };
  const key = titleMap[normalized];
  return key ? translate(key) : title;
}

function localizedNotificationBody(title: string, body: string, translate: (key: string) => string) {
  const normalized = `${title} ${body}`.toLowerCase();
  if (normalized.includes("pro") && normalized.includes("free trial")) return translate("notificationProTrialActivatedBody");
  if (normalized.includes("payment") && normalized.includes("secured")) return translate("notificationPaymentSecuredBody");
  if (normalized.includes("payment") && normalized.includes("released")) return translate("notificationPaymentReleasedBody");
  if (normalized.includes("offer")) return translate("notificationOfferBody");
  if (normalized.includes("message")) return translate("notificationMessageBody");
  if (normalized.includes("cancel")) return translate("notificationCancelledBody");
  if (normalized.includes("completed")) return translate("notificationCompletedBody");
  if (normalized.includes("assigned")) return translate("notificationAssignedBody");
  return body;
}
