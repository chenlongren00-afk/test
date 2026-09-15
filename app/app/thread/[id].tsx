import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as React from "react";
import { Alert, AppState, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { ImagePlus, X } from "lucide-react-native";

import { AHButton, Card, StatusBanner, TextField } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors, spacing } from "@/theme/colors";

export default function ThreadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const store = useAppStore();
  const existingThread = store.state.threads.find((item) => item.taskId === id || item.id === id);
  const routeTaskId = existingThread?.taskId || (id?.startsWith("thread-") ? id.slice("thread-".length) : id);
  const task = store.state.tasks.find((item) => item.id === routeTaskId);
  const taskPaymentStatus = String(task?.paymentStatus || "").toLowerCase();
  const taskContactUnlocked = Boolean(
    task?.contactUnlocked ||
    task?.paymentSecuredAt ||
    ["secured", "paid", "released"].includes(taskPaymentStatus) ||
    ["payment_secured", "assigned", "in_progress", "payment_requested", "completed", "payment_released"].includes(String(task?.status || ""))
  );
  const thread = existingThread || (task && taskContactUnlocked ? {
    id: `thread-${task.id}`,
    taskId: task.id,
    title: task.title,
    participantIds: [task.createdBy, task.helperUserId].filter(Boolean),
    messages: [],
    unreadCount: 0
  } : null);
  const messageInputUnlocked = taskContactUnlocked || Boolean(existingThread);
  const [body, setBody] = React.useState("");
  const [attachments, setAttachments] = React.useState<{ id: string; type: string; source: string }[]>([]);
  const [previewPhoto, setPreviewPhoto] = React.useState<string | null>(null);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const refreshAll = store.refreshAll;
  const silentRefreshAll = store.silentRefreshAll;
  const refreshInFlightRef = React.useRef(false);
  const scrollRef = React.useRef<ScrollView>(null);

  const refreshThread = React.useCallback(async (visible = false) => {
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
      void refreshThread(false);
      return undefined;
    }, [refreshThread])
  );

  React.useEffect(() => {
    navigation.setOptions({ title: thread?.title || store.translate("taskChat") });
  }, [navigation, store, thread?.title]);

  React.useEffect(() => {
    if (!thread) return;
    void store.markThreadRead(thread.id);
  }, [id, store, thread]);

  React.useEffect(() => {
    let mounted = true;

    void refreshThread(false);
    const timer = setInterval(() => {
      if (mounted) void refreshThread(false);
    }, 30000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (mounted && state === "active") void refreshThread(false);
    });

    return () => {
      mounted = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [id, refreshThread]);

  async function addPhotos() {
    setSendError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(store.translate("photosPermissionTitle") || "Photos", store.translate("photosPermissionBody") || "Please allow photo access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      base64: true,
      mediaTypes: ["images"],
      quality: 0.7,
      selectionLimit: Math.max(1, 6 - attachments.length)
    });
    if (result.canceled) return;
    const next = result.assets
      .map((asset, index) => {
        if (!asset.base64) return null;
        const mime = asset.mimeType || "image/jpeg";
        return {
          id: `${Date.now()}-${index}`,
          type: "image",
          source: `data:${mime};base64,${asset.base64}`
        };
      })
      .filter(Boolean) as { id: string; type: string; source: string }[];
    setAttachments((current) => [...current, ...next].slice(0, 6));
  }

  async function send() {
    setSendError(null);
    if (!messageInputUnlocked) {
      setSendError(store.translate("messageBoxLocked"));
      return;
    }
    const taskId = thread?.taskId || routeTaskId;
    const outgoing = body.trim();
    const error = await store.sendMessage(taskId, { body: outgoing, attachments });
    if (!error) {
      setBody("");
      setAttachments([]);
      await refreshAll();
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
    } else {
      setSendError(error);
    }
  }

  if (!thread) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.screen }}
        refreshControl={<RefreshControl refreshing={store.isRefreshing} onRefresh={() => refreshThread(true)} tintColor={colors.primary} />}
      >
        <StatusBanner message={store.translate("threadNotFound")} />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      style={{ flex: 1 }}
    >
      <ScrollView
        ref={scrollRef}
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: spacing.gap, padding: spacing.screen, paddingBottom: 96 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        refreshControl={<RefreshControl refreshing={store.isRefreshing} onRefresh={() => refreshThread(true)} tintColor={colors.primary} />}
      >
        {store.error ? <StatusBanner tone="error" message={store.error} /> : null}
        {sendError ? <StatusBanner tone="error" message={sendError} /> : null}
        <Card tone="warm">
          <Text selectable style={{ color: colors.text, fontSize: 19, fontWeight: "900" }}>
            {thread.title}
          </Text>
          <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>
            {store.translate("taskThread")} · {thread.messages?.length || 0} {store.translate("messagesCount")}
          </Text>
          <Text selectable style={{ color: colors.primary, fontSize: 12, fontWeight: "800", lineHeight: 18 }}>
            {store.translate("messageThreadSyncing")}
          </Text>
        </Card>

        <View style={{ gap: 10 }}>
          {(thread.messages || []).map((message) => {
            const mine = store.currentAccountUserIds.includes(message.senderId);
            return (
              <View key={message.id} style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
                <View
                  style={{
                    backgroundColor: mine ? colors.primary : colors.surface,
                    borderColor: mine ? colors.primary : colors.border,
                    borderRadius: 8,
                    borderWidth: 1,
                    maxWidth: "88%",
                    padding: 12,
                    gap: 4
                  }}
                >
                  <Text selectable style={{ color: mine ? colors.surface : colors.text, fontSize: 12, fontWeight: "900" }}>
                    {message.senderName}
                  </Text>
                  <Text selectable style={{ color: mine ? colors.surface : colors.text, fontSize: 15, lineHeight: 21 }}>
                    {message.body}
                  </Text>
                  {message.attachments?.length ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: message.body ? 6 : 0 }}>
                      {message.attachments.map((attachment) => (
                        <Pressable key={attachment.id || attachment.source} accessibilityRole="imagebutton" onPress={() => setPreviewPhoto(attachment.source)}>
                          <Image
                            source={{ uri: attachment.source }}
                            style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, height: 96, width: 96 }}
                          />
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  {message.mediaModerationStatus && message.mediaModerationStatus !== "approved" ? (
                    <Text selectable style={{ color: mine ? colors.surface : colors.muted, fontSize: 11, fontWeight: "800" }}>
                      {message.mediaModerationStatus === "needs_review" ? "Photo pending review" : "Photo hidden by review"}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <Card>
          {!store.isAuthenticated ? <StatusBanner tone="error" message={store.translate("loginBeforeMessages")} /> : null}
          {!messageInputUnlocked ? <StatusBanner message={store.translate("messageBoxLocked")} /> : null}
          {attachments.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {attachments.map((attachment) => (
                <View key={attachment.id}>
                  <Pressable accessibilityRole="imagebutton" onPress={() => setPreviewPhoto(attachment.source)}>
                    <Image source={{ uri: attachment.source }} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, height: 70, width: 70 }} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                    style={{ alignItems: "center", backgroundColor: colors.text, borderRadius: 12, height: 24, justifyContent: "center", position: "absolute", right: -8, top: -8, width: 24 }}
                  >
                    <X color={colors.surface} size={14} strokeWidth={3} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <TextField label={store.translate("message")} value={body} onChangeText={setBody} multiline placeholder={store.translate("writeTaskUpdate")} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 0.34 }}>
              <AHButton label={store.translate("photos") || "Photos"} tone="secondary" icon={<ImagePlus color={colors.primary} size={18} strokeWidth={3} />} disabled={!store.isAuthenticated || !messageInputUnlocked || attachments.length >= 6} onPress={addPhotos} />
            </View>
            <View style={{ flex: 0.66 }}>
              <AHButton label={store.translate("sendMessage")} disabled={!store.isAuthenticated || !messageInputUnlocked || (!body.trim() && attachments.length === 0)} loading={store.isSubmitting} onPress={send} />
            </View>
          </View>
        </Card>
      </ScrollView>
      <Modal visible={Boolean(previewPhoto)} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={{ alignItems: "center", backgroundColor: "rgba(0,0,0,0.88)", flex: 1, justifyContent: "center", padding: 16 }}>
          <Pressable accessibilityRole="button" onPress={() => setPreviewPhoto(null)} style={{ position: "absolute", right: 18, top: 52, zIndex: 2 }}>
            <X color={colors.surface} size={30} strokeWidth={3} />
          </Pressable>
          {previewPhoto ? (
            <Image source={{ uri: previewPhoto }} resizeMode="contain" style={{ height: "86%", width: "100%" }} />
          ) : null}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
