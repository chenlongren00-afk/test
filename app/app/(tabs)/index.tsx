import { useRouter } from "expo-router";
import { Bell, BriefcaseBusiness, MessageSquareText, PlusCircle, RefreshCw, Search } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { AHButton, ActionMetric, BrandHeader, Card, SectionTitle, StatusBanner, TaskCard } from "@/components/ui";
import { notificationRouteData, notificationRouteHref } from "@/services/notification-routing";
import { useAppStore } from "@/state/app-store";
import { colors, spacing } from "@/theme/colors";

export default function HomeRoute() {
  const store = useAppStore();
  const router = useRouter();
  const actionItems = React.useMemo(() => (
    store.state.notifications
      .filter((item) => !item.read && homeActionPriority(item) > 0)
      .sort((left, right) => homeActionPriority(right) - homeActionPriority(left))
  ), [store.state.notifications]);
  const nextAction = actionItems[0];
  const recommendedTasks = store.openTasks.slice(0, 3);

  async function openActionCentreItem(item?: (typeof store.state.notifications)[number]) {
    if (!item) {
      router.push("/notifications");
      return;
    }
    await store.openNotification(item);
    router.push(notificationRouteHref(notificationRouteData(item)));
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.gap, padding: spacing.screen, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={store.isRefreshing} onRefresh={store.refreshAll} tintColor={colors.primary} />}
    >
      <BrandHeader
        eyebrow={store.isAuthenticated ? `${store.translate("hi")}, ${store.currentUser?.name || store.translate("helper")}` : store.translate("signInToUseMarketplace")}
        notificationCount={actionItems.length}
        onPressNotifications={() => router.push("/notifications")}
      />

      <Card>
        <SectionTitle
          title={store.translate("nextStep")}
          subtitle={nextAction ? store.translate("openActionCentreToContinue") : store.translate("noActionsWaiting")}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void openActionCentreItem(nextAction)}
          style={{
            backgroundColor: nextAction ? colors.surfaceWarm : colors.surfaceAlt,
            borderColor: nextAction ? colors.accent : colors.border,
            borderRadius: 8,
            borderWidth: 1,
            gap: 5,
            padding: 12
          }}
        >
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
            {nextAction ? localizedActionTitle(nextAction.title, store.translate) : store.translate("youAreUpToDate")}
          </Text>
          <Text selectable numberOfLines={2} style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            {nextAction ? localizedActionBody(nextAction.title, nextAction.body, store.translate) : store.translate("browseOrPostWhenReady")}
          </Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <ActionMetric
            icon={<BriefcaseBusiness color={colors.primary} size={20} />}
            label={store.translate("openTasks")}
            value={store.openTasks.length}
            onPress={() => router.push("/browse")}
          />
          <ActionMetric
            icon={<Bell color={colors.primary} size={20} />}
            label={store.translate("actionCentre")}
            value={actionItems.length}
            onPress={() => router.push("/notifications")}
          />
          <ActionMetric
            icon={<MessageSquareText color={colors.primary} size={20} />}
            label={store.translate("messages")}
            value={store.state.threads.length}
            onPress={() => router.push("/messages")}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AHButton
              label={store.translate("post")}
              icon={<PlusCircle color={colors.surface} size={18} />}
              onPress={() => router.push("/post")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AHButton
              label={store.translate("browse")}
              icon={<Search color={colors.primary} size={18} />}
              tone="secondary"
              onPress={() => router.push("/browse")}
            />
          </View>
        </View>
      </Card>

      {store.error ? <StatusBanner tone="error" message={store.error} /> : null}
      {store.isLoading && store.state.tasks.length === 0 && store.state.users.length === 0 ? (
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Text selectable style={{ color: colors.muted, textAlign: "center" }}>
            {store.translate("loadingAustralianHelper")}
          </Text>
        </Card>
      ) : null}

      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <SectionTitle title={store.translate("recommendedTasks")} subtitle={store.translate("recommendedTasksSubtitle")} />
        <Pressable accessibilityRole="button" onPress={() => void store.refreshAll()} style={{ padding: 8 }}>
          <RefreshCw color={colors.primary} size={20} />
        </Pressable>
      </View>

      {recommendedTasks.length ? (
        recommendedTasks.slice(0, 3).map((task) => <TaskCard key={task.id} task={task} href={`/task/${task.id}`} />)
      ) : (
        <StatusBanner message={store.translate("noRecommendedTasks")} />
      )}
    </ScrollView>
  );
}

function homeActionPriority(item: { type?: string; title?: string; body?: string }) {
  const normalized = `${item.type || ""} ${item.title || ""} ${item.body || ""}`.toLowerCase();
  if (normalized.includes("payment") || normalized.includes("release") || normalized.includes("payout")) return 6;
  if (normalized.includes("counter")) return 5;
  if (normalized.includes("offer")) return 4;
  if (normalized.includes("message")) return 3;
  if (normalized.includes("review") || normalized.includes("approve") || normalized.includes("verification")) return 2;
  return 0;
}

function localizedActionTitle(title: string, translate: (key: string) => string) {
  return translate(title) === title ? title : translate(title);
}

function localizedActionBody(title: string, body: string, translate: (key: string) => string) {
  const localized = translate(body);
  if (localized !== body) return localized;
  const normalized = `${title} ${body}`.toLowerCase();
  if (normalized.includes("message")) return translate("replyToMessageAction");
  if (normalized.includes("payment") || normalized.includes("release")) return translate("paymentActionRequired");
  if (normalized.includes("offer") || normalized.includes("counter")) return translate("offerActionRequired");
  return body;
}

function HomeStepRow({
  icon,
  title,
  subtitle,
  status,
  onPress
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityLabel={title} accessibilityRole="button" onPress={onPress}>
      <Card>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.surfaceAlt,
              borderRadius: 8,
              height: 42,
              justifyContent: "center",
              width: 42
            }}
          >
            {icon}
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
              {title}
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
              {subtitle}
            </Text>
          </View>
          <Text selectable style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>
            {status}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}
