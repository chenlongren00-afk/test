import { Link, useFocusEffect } from "expo-router";
import * as React from "react";
import { AppState, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { Card, SectionTitle, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors, spacing } from "@/theme/colors";

export default function MessagesRoute() {
  const store = useAppStore();
  const refreshAll = store.refreshAll;
  const silentRefreshAll = store.silentRefreshAll;
  const refreshInFlightRef = React.useRef(false);

  const refreshMessages = React.useCallback(async (visible = false) => {
    if (refreshInFlightRef.current || AppState.currentState !== "active") return;
    refreshInFlightRef.current = true;
    try {
      await (visible ? refreshAll() : silentRefreshAll());
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [refreshAll, silentRefreshAll]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshMessages(false);
      return undefined;
    }, [refreshMessages])
  );

  React.useEffect(() => {
    let mounted = true;

    void refreshMessages(false);
    const timer = setInterval(() => {
      if (mounted) void refreshMessages(false);
    }, 30000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (mounted && state === "active") void refreshMessages(false);
    });

    return () => {
      mounted = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [refreshMessages]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.gap, padding: spacing.screen, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={store.isRefreshing} onRefresh={() => refreshMessages(true)} tintColor={colors.primary} />}
    >
      <SectionTitle title={store.translate("messages")} subtitle={store.translate("messagesSubtitle")} />
      {!store.isAuthenticated ? <StatusBanner message={store.translate("loginBeforeMessages")} /> : null}

      {store.threads.length ? (
        store.threads.map((thread) => {
          const lastMessage = thread.messages?.[thread.messages.length - 1];
          const routeId = thread.taskId || thread.id;
          return (
            <Link key={thread.id} href={`/thread/${routeId}`} asChild>
              <Pressable accessibilityLabel={thread.title || store.translate("taskChat")} accessibilityRole="button">
                <Card>
                  <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
                    <Text selectable style={{ color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" }}>
                      {thread.title || store.translate("taskChat")}
                    </Text>
                    {thread.unreadCount ? (
                      <Text selectable style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }}>
                        {thread.unreadCount}
                      </Text>
                    ) : null}
                  </View>
                  <Text selectable numberOfLines={2} style={{ color: colors.muted, lineHeight: 20 }}>
                    {lastMessage ? `${lastMessage.senderName}: ${lastMessage.body}` : store.translate("noMessagesYet")}
                  </Text>
                </Card>
              </Pressable>
            </Link>
          );
        })
      ) : (
        <StatusBanner message={store.translate("noMessageThreads")} />
      )}
    </ScrollView>
  );
}
