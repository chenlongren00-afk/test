import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as React from "react";
import { Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Share, Text, View } from "react-native";
import { ArrowLeftRight, CheckCircle2, ChevronLeft, PlayCircle, Share2, Star, Trash2, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TaskMapPreview } from "@/components/TaskMapPreview";
import { useTurnstileChallenge } from "@/components/TurnstileChallenge";
import { AHButton, Card, FeeBreakdownCard, HelperTrustCard, Pill, SectionTitle, StatusBanner, TextField } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors, spacing } from "@/theme/colors";
import type { HelperTask, Offer, OfferDraft, Review, TaskReviewTargetRole } from "@/types/marketplace";
import { amountFrom, offerFeeBreakdown } from "@/utils/fees";
import { compactDate, money, taskStatusLabel } from "@/utils/format";

type PrimaryTaskActionKey = "choose_helper" | "pay" | "start" | "request_release" | "release" | "contact" | "offer";

export default function TaskDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const store = useAppStore();
  const { challenge, runChallenge } = useTurnstileChallenge();
  const task = store.state.tasks.find((item) => item.id === id);
  const [draft, setDraft] = React.useState<OfferDraft>({ amount: "", message: "" });
  const [counterDraft, setCounterDraft] = React.useState<OfferDraft>({ amount: "", message: "" });
  const [counterOfferId, setCounterOfferId] = React.useState<string | null>(null);
  const [offerSubmitAttempted, setOfferSubmitAttempted] = React.useState(false);
  const [counterSubmitAttempted, setCounterSubmitAttempted] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [showMapPreview, setShowMapPreview] = React.useState(false);
  const [isStartingTask, setIsStartingTask] = React.useState(false);
  const [isDeletingTask, setIsDeletingTask] = React.useState(false);
  const [reviewTargetRole, setReviewTargetRole] = React.useState<TaskReviewTargetRole | null>(null);
  const [reviewRating, setReviewRating] = React.useState(5);
  const [reviewComment, setReviewComment] = React.useState("");
  const [selectedOfferId, setSelectedOfferId] = React.useState<string | null>(null);
  const [preAcceptOffer, setPreAcceptOffer] = React.useState<Offer | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState(0);
  const [previewPhoto, setPreviewPhoto] = React.useState<string | null>(null);
  const scrollRef = React.useRef<ScrollView>(null);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: store.translate("taskDetail"),
      headerLeft: () => (
        <Pressable
          accessibilityLabel={store.translate("back")}
          accessibilityRole="button"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/browse");
          }}
          style={{ padding: 8 }}
        >
          <ChevronLeft color={colors.text} size={26} strokeWidth={3} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          accessibilityLabel={store.translate("share")}
          accessibilityRole="button"
          onPress={() => {
            const currentTask = store.state.tasks.find((item) => item.id === id);
            const taskUrl = currentTask ? `https://australianhelper.com/browse?task=${encodeURIComponent(currentTask.id)}` : "https://australianhelper.com/browse";
            void Share.share({
              title: currentTask?.title || "Australian Helper task",
              message: currentTask
                ? `${currentTask.title}\n${currentTask.description}\n\n${currentTask.suburb}, ${currentTask.state} · ${compactDate(currentTask.date, currentTask.time)}\nBudget: ${money(currentTask.budget)}\n\n${taskUrl}`
                : taskUrl,
              url: taskUrl
            }).catch(() => null);
          }}
          style={{ padding: 8 }}
        >
          <Share2 color={colors.text} size={22} strokeWidth={2.6} />
        </Pressable>
      )
    });
  }, [id, navigation, router, store]);

  function focusOfferComposer() {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }

  function scrollToOfferBoard() {
    scrollRef.current?.scrollTo({ y: 520, animated: true });
  }

  function openHelperProfile(helperId?: string, helperName?: string, offerId?: string) {
    const cleanHelperId = String(helperId || "").trim();
    const cleanHelperName = String(helperName || "").trim();
    if (!cleanHelperId && !cleanHelperName) return;
    router.push({
      pathname: "/helper-profile",
      params: { helperId: cleanHelperId, helperName: cleanHelperName, taskId: task?.id || "", offerId: offerId || "" }
    });
  }

  function openTaskerProfile(userId?: string) {
    const cleanUserId = String(userId || "").trim();
    if (!cleanUserId) return;
    router.push({
      pathname: "/helper-profile",
      params: { userId: cleanUserId }
    });
  }

  async function submitOffer() {
    if (!task) return;
    Keyboard.dismiss();
    setOfferSubmitAttempted(true);
    const amountError = validateOfferAmount(draft.amount, store.translate);
    const messageError = validateOfferMessage(draft.message, store.translate);
    if (amountError || messageError) {
      setNotice(null);
      Alert.alert(store.translate("offerNotSentTitle"), store.translate("fixOfferBeforeSending"), [{ text: store.translate("done") }]);
      return;
    }
    let antiRobotToken = "";
    try {
      antiRobotToken = await runChallenge("submit_offer");
    } catch (error) {
      Alert.alert(store.translate("offerNotSentTitle"), error instanceof Error ? error.message : "Security verification failed. Please try again.");
      return;
    }
    const error = await store.submitOffer(task.id, draft, antiRobotToken);
    if (!error) {
      const message = store.translate("offerSentNotice");
      setNotice(message);
      setDraft({ amount: "", message: "" });
      setOfferSubmitAttempted(false);
      Alert.alert(store.translate("offerSentTitle"), message, [{ text: store.translate("done") }]);
    }
  }

  async function acceptOffer(offerId: string) {
    if (!task) return;
    let antiRobotToken = "";
    try {
      antiRobotToken = await runChallenge("accept_offer");
    } catch (error) {
      Alert.alert(store.translate("acceptOffer"), error instanceof Error ? error.message : "Security verification failed. Please try again.");
      return;
    }
    const error = await store.acceptOffer(task.id, offerId, antiRobotToken);
    if (!error) {
      setPreAcceptOffer(null);
      const message = store.translate("offerAcceptedNotice");
      setNotice(message);
      Alert.alert(store.translate("acceptOffer"), message, [
        { text: store.translate("done"), style: "cancel" },
        {
          text: store.translate("paySecureFunds"),
          onPress: openSecurePayment
        }
      ]);
    }
  }

  function openCounterOffer(offer: Offer) {
    if (!task) return;
    const isTasker = store.currentAccountUserIds.includes(task.createdBy);
    setCounterOfferId(offer.id);
    setCounterSubmitAttempted(false);
    setCounterDraft({
      amount: String(offer.amount || ""),
      message: isTasker
        ? "I can proceed if the task price is adjusted to this amount."
        : "I can help at this revised amount and confirm the details before starting."
    });
    focusOfferComposer();
  }

  async function submitCounterOffer(offer: Offer) {
    if (!task) return;
    Keyboard.dismiss();
    setCounterSubmitAttempted(true);
    const amountError = validateOfferAmount(counterDraft.amount, store.translate);
    const messageError = validateOfferMessage(counterDraft.message, store.translate);
    if (amountError || messageError) {
      setNotice(null);
      Alert.alert(store.translate("counterOfferNotSentTitle"), store.translate("fixCounterOfferBeforeSending"), [{ text: store.translate("done") }]);
      return;
    }
    let antiRobotToken = "";
    try {
      antiRobotToken = await runChallenge("counter_offer");
    } catch (error) {
      Alert.alert(store.translate("counterOfferNotSentTitle"), error instanceof Error ? error.message : "Security verification failed. Please try again.");
      return;
    }
    const error = await store.counterOffer(task.id, offer.id, counterDraft, antiRobotToken);
    if (!error) {
      const isTasker = store.currentAccountUserIds.includes(task.createdBy);
      const message = store.translate(isTasker ? "taskerCounterSentNotice" : "helperCounterSentNotice");
      setNotice(message);
      setCounterOfferId(null);
      setCounterDraft({ amount: "", message: "" });
      setCounterSubmitAttempted(false);
      Alert.alert(store.translate("counterOfferSentTitle"), message, [{ text: store.translate("done") }]);
    }
  }

  async function startTask() {
    if (!task || isStartingTask) return;
    setIsStartingTask(true);
    const error = await store.startTask(task.id);
    setIsStartingTask(false);
    if (!error) setNotice(store.translate("taskStartedNotice"));
  }

  function contactHelperNow() {
    if (!task) return;
    router.push(`/thread/${task.id}`);
  }

  function openSecurePayment() {
    if (!task) return;
    router.push(`/payment?taskId=${encodeURIComponent(task.id)}`);
  }

  async function requestPaymentRelease() {
    if (!task) return;
    const error = await store.requestPaymentRelease(task.id);
    if (!error) setNotice(store.translate("requestReleaseNotice"));
  }

  function confirmPaymentRelease() {
    if (!task) return;
    const amount = money(task.taskPrice ?? task.paymentAmount ?? task.feeBreakdown?.taskPrice ?? task.budget);
    Alert.alert(
      store.translate("confirmPaymentReleaseTitle"),
      store.translate("confirmPaymentReleaseBody")
        .replace("{amount}", amount)
        .replace("{task}", task.title),
      [
        { text: store.translate("cancel"), style: "cancel" },
        {
          text: store.translate("confirmRelease"),
          style: "destructive",
          onPress: () => {
            void releasePayment();
          }
        }
      ]
    );
  }

  async function releasePayment() {
    if (!task) return;
    const error = await store.confirmCompletionAndReleasePayment(task.id);
    if (!error) setNotice(store.translate("paymentReleasedNotice"));
  }

  function confirmDeleteTask() {
    if (!task || isDeletingTask) return;
    Alert.alert(
      store.translate("deleteTaskTitle"),
      store.translate("deleteTaskConfirmBody").replace("{task}", task.title),
      [
        { text: store.translate("cancel"), style: "cancel" },
        {
          text: store.translate("deleteTask"),
          style: "destructive",
          onPress: () => {
            void deleteTask();
          }
        }
      ]
    );
  }

  function confirmCancellationRequest() {
    if (!task) return;
    Alert.alert(
      store.translate("cancelTask"),
      store.translate("cancellationRequestRules") || "Cancellation may include a fee depending on timing and task status.",
      [
        { text: store.translate("cancel"), style: "cancel" },
        {
          text: store.translate("requestCancellation"),
          style: "destructive",
          onPress: () => {
            void requestCancellation();
          }
        }
      ]
    );
  }

  async function requestCancellation() {
    if (!task) return;
    const error = await store.requestCancellation(task.id, {
      reason: "Tasker requested cancellation after accepting an offer.",
      details: "Requested from the task detail cancel button."
    });
    if (!error) setNotice(store.translate("cancellationRequestedNotice") || "Cancellation requested. The other party has been notified.");
  }

  async function deleteTask() {
    if (!task || isDeletingTask) return;
    setIsDeletingTask(true);
    const error = await store.deleteTask(task.id);
    setIsDeletingTask(false);
    if (!error) {
      Alert.alert(store.translate("taskDeletedTitle"), store.translate("taskDeletedNotice"), [
        { text: store.translate("done"), onPress: () => router.replace("/my-posted-tasks") }
      ]);
    }
  }

  async function submitTaskReview() {
    if (!task || !reviewTargetRole) return;
    Keyboard.dismiss();
    const error = await store.submitTaskReview(task.id, reviewTargetRole, {
      rating: reviewRating,
      comment: reviewComment
    });
    if (!error) {
      const message = store.translate("reviewSubmittedNotice");
      setNotice(message);
      setReviewTargetRole(null);
      setReviewRating(5);
      setReviewComment("");
      Alert.alert(store.translate("reviewSubmittedTitle"), message, [{ text: store.translate("done") }]);
    }
  }

  if (!task) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.screen }}
        refreshControl={<RefreshControl refreshing={store.isRefreshing} onRefresh={store.refreshAll} tintColor={colors.primary} />}
      >
        <StatusBanner tone="error" message={store.translate("taskNotFound")} />
      </ScrollView>
    );
  }

  const isOwnTask = store.currentAccountUserIds.includes(task.createdBy);
  const tasker = store.state.users.find((user) => user.id === task.createdBy);
  const isAssignedToCurrentAccount =
    (task.assignedHelperId ? store.currentHelperIds.includes(task.assignedHelperId) : false) ||
    (task.helperUserId ? store.currentAccountUserIds.includes(task.helperUserId) : false);
  const paymentStatus = String(task.paymentStatus || "").toLowerCase();
  const taskPaymentSecured = ["secured", "paid"].includes(paymentStatus);
  const contactUnlocked = Boolean(task.contactUnlocked || task.paymentSecuredAt || taskPaymentSecured);
  const sortedOffers = [...(task.offers || [])].sort((left, right) => (
    Number(Boolean(right.helperIsPro)) - Number(Boolean(left.helperIsPro)) ||
    Number(left.amount || 0) - Number(right.amount || 0)
  ));
  const acceptedOffer = task.acceptedOfferId
    ? sortedOffers.find((offer) => offer.id === task.acceptedOfferId)
    : sortedOffers.find((offer) => offer.status === "accepted");
  const currentHelperOffer = sortedOffers.find((offer) => store.currentHelperIds.includes(offer.helperId));
  const hasAcceptedOfferAwaitingPayment =
    Boolean(acceptedOffer || task.acceptedOfferId) &&
    !contactUnlocked &&
    !["payment_secured", "assigned", "in_progress", "payment_requested", "completed", "payment_released", "cancel_requested", "cancelled", "auto_cancelled", "disputed", "refunded"].includes(task.status) &&
    ["", "awaiting_payment", "pending", "unpaid", "none", "requires_payment_method", "requires_action", "failed"].includes(paymentStatus);
  const visibleOffers = isOwnTask
    ? sortedOffers
    : sortedOffers.filter((offer) => store.currentHelperIds.includes(offer.helperId));
  const canRequestPaymentRelease =
    isAssignedToCurrentAccount &&
    ["assigned", "in_progress"].includes(task.status) &&
    taskPaymentSecured;
  const canStartTask =
    isAssignedToCurrentAccount &&
    ["assigned", "payment_secured"].includes(task.status) &&
    taskPaymentSecured;
  const canReleasePayment =
    isOwnTask &&
    (task.status === "payment_requested" || (["assigned", "in_progress"].includes(task.status) && taskPaymentSecured));
  const shouldShowHelperCompletion = isAssignedToCurrentAccount && ["assigned", "payment_secured", "in_progress", "payment_requested"].includes(task.status);
  const helperCompletionBlocked =
    isAssignedToCurrentAccount && ["assigned", "payment_secured", "in_progress"].includes(task.status) && !taskPaymentSecured;
  const canAcceptOffers = isOwnTask && visibleOffers.length > 0;
  const acceptableOffers = visibleOffers.filter((offer) => offer.status === "pending");
  const selectedOffer = acceptableOffers.find((offer) => offer.id === selectedOfferId) || null;
  const canContactHelperNow = contactUnlocked && (isOwnTask || isAssignedToCurrentAccount);
  const canPayAndSecureFunds = isOwnTask && hasAcceptedOfferAwaitingPayment;
  const canRequestTaskerCancellation =
    isOwnTask &&
    Boolean(task.acceptedOfferId || task.assignedHelperId || task.helperUserId) &&
    ["awaiting_payment", "payment_secured", "assigned", "in_progress", "payment_requested"].includes(task.status);
  const shouldShowPaymentDetails =
    Boolean(task.acceptedOfferId || task.assignedHelperId || task.paymentSecuredAt) ||
    ["awaiting_payment", "payment_secured", "assigned", "in_progress", "payment_requested", "completed", "payment_released", "cancel_requested", "cancelled", "disputed", "refunded"].includes(task.status);
  const canReviewHelper =
    isOwnTask &&
    task.status === "payment_released" &&
    !task.reviewedByTaskerAt &&
    !task.taskerReviewId;
  const canReviewTasker =
    isAssignedToCurrentAccount &&
    task.status === "payment_released" &&
    !task.reviewedByHelperAt &&
    !task.helperReviewId;
  const canDeleteTask =
    isOwnTask &&
    !task.acceptedOfferId &&
    !task.assignedHelperId &&
    !task.helperUserId &&
    ["open", "offer_received", "content_review", "rejected_by_moderation"].includes(task.status) &&
    ["", "unpaid", "none", "cancelled", "failed", "refunded"].includes(paymentStatus) &&
    ["", "not_requested", "none", "cancelled", "refunded"].includes(String(task.payoutStatus || "not_requested").toLowerCase());
  const canSendOffer =
    store.isAuthenticated &&
    !isOwnTask &&
    !currentHelperOffer &&
    ["open", "offer_received"].includes(task.status);
  const offerPreviewAmount = amountFrom(draft.amount) || task.budget;
  const offerAmountError = (offerSubmitAttempted || draft.amount.trim().length > 0)
    ? validateOfferAmount(draft.amount, store.translate)
    : null;
  const offerMessageError = (offerSubmitAttempted || draft.message.trim().length > 0)
    ? validateOfferMessage(draft.message, store.translate)
    : null;
  const offerFormReady = canSendOffer && !offerAmountError && !offerMessageError;
  const counterAmountError = (counterSubmitAttempted || counterDraft.amount.trim().length > 0)
    ? validateOfferAmount(counterDraft.amount, store.translate)
    : null;
  const counterMessageError = (counterSubmitAttempted || counterDraft.message.trim().length > 0)
    ? validateOfferMessage(counterDraft.message, store.translate)
    : null;
  const counterFormReady = !counterAmountError && !counterMessageError;
  const primaryTaskActionKey: PrimaryTaskActionKey | null = (() => {
    if (isOwnTask && acceptableOffers.length > 0 && !selectedOffer) {
      return "choose_helper";
    }
    if (canPayAndSecureFunds) {
      return "pay";
    }
    if (canStartTask) {
      return "start";
    }
    if (canRequestPaymentRelease) {
      return "request_release";
    }
    if (canReleasePayment) {
      return "release";
    }
    if (canContactHelperNow) {
      return "contact";
    }
    if (canSendOffer) {
      return "offer";
    }
    return null;
  })();

  const primaryTaskActionContent = primaryTaskActionKey ? getPrimaryTaskActionContent(primaryTaskActionKey, store.translate) : null;

  function runPrimaryTaskAction(action: PrimaryTaskActionKey) {
    if (action === "choose_helper") {
      scrollToOfferBoard();
      return;
    }
    if (action === "pay") {
      openSecurePayment();
      return;
    }
    if (action === "start") {
      void startTask();
      return;
    }
    if (action === "request_release") {
      void requestPaymentRelease();
      return;
    }
    if (action === "release") {
      confirmPaymentRelease();
      return;
    }
    if (action === "contact") {
      contactHelperNow();
      return;
    }
    focusOfferComposer();
  }

  return (
    <>
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
          refreshControl={<RefreshControl refreshing={store.isRefreshing} onRefresh={store.refreshAll} tintColor={colors.primary} />}
        >
          {notice ? <StatusBanner tone="success" message={notice} /> : null}
          {store.error ? <StatusBanner tone="error" message={store.error} /> : null}

          <Card>
            <Text selectable numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }}>
              {task.category.split(",").map((item) => store.localizedCategory(item.trim())).join(", ")} · {store.translate(taskStatusLabel(task.status))}
            </Text>
            <Text selectable style={{ color: colors.text, fontSize: 26, fontWeight: "900", lineHeight: 31 }}>
              {task.title}
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
              {task.description}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Card tone="warm" style={{ flex: 0.38, minWidth: 0, padding: 14 }}>
                <Text selectable style={{ color: colors.primary, fontSize: 19, fontWeight: "900" }}>
                  {money(task.budget)}
                </Text>
                <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
                  {store.translate("budgetLabel")}
                </Text>
              </Card>
              <Card tone="warm" style={{ flex: 0.62, minWidth: 0, padding: 14 }}>
                <Text selectable numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.76} style={{ color: colors.primary, fontSize: 14, fontWeight: "900" }}>
                  {task.suburb}, {task.state}
                </Text>
                <Text selectable numberOfLines={2} style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
                  {compactDate(task.date, task.time)}
                </Text>
              </Card>
            </View>
          </Card>

          <Pressable accessibilityRole="link" onPress={() => openTaskerProfile(task.createdBy)}>
            <Card>
              <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
                {tasker?.avatarURL ? (
                  <Image source={{ uri: tasker.avatarURL }} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 26, height: 52, width: 52 }} />
                ) : (
                  <View style={{ alignItems: "center", backgroundColor: colors.surfaceWarm, borderRadius: 26, height: 52, justifyContent: "center", width: 52 }}>
                    <Text style={{ color: colors.accentDark, fontSize: 18, fontWeight: "900" }}>
                      {(tasker?.name || store.translate("tasker")).trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
                    {tasker?.name || store.translate("tasker")}
                  </Text>
                  <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
                    {store.translate("profile")} · {tasker?.suburb || task.suburb}
                  </Text>
                  <Text selectable style={{ color: colors.accentDark, fontSize: 12, fontWeight: "900" }}>
                    ★ {Number(tasker?.rating || 0).toFixed(1)} · {Number(tasker?.reviewCount ?? tasker?.reviews?.length ?? 0)} {store.translate("reviews")}
                  </Text>
                </View>
                <Text style={{ color: colors.primary, fontSize: 24, fontWeight: "900" }}>›</Text>
              </View>
            </Card>
          </Pressable>

        <TaskNextStepCard task={task} />
        {primaryTaskActionKey && primaryTaskActionContent ? (
          <Card tone="warm">
            <SectionTitle title={primaryTaskActionContent.title} subtitle={primaryTaskActionContent.body} />
            <AHButton
              label={primaryTaskActionContent.label}
              tone={primaryTaskActionContent.tone}
              loading={store.isSubmitting || (primaryTaskActionKey === "start" && isStartingTask)}
              onPress={() => runPrimaryTaskAction(primaryTaskActionKey)}
            />
          </Card>
        ) : null}

        {task.photos?.length ? (
          <TaskPhotoCarousel
            photos={task.photos}
            selectedIndex={selectedPhotoIndex}
            title={task.title}
            onSelect={setSelectedPhotoIndex}
            onOpenPhoto={setPreviewPhoto}
          />
        ) : null}

        <TaskMapPreview tasks={[task]} compact onExpand={() => setShowMapPreview(true)} />

        {shouldShowPaymentDetails ? <FeeBreakdownCard breakdown={task.feeBreakdown} amount={task.budget} /> : null}

        {shouldShowHelperCompletion ? (
          <Card>
            <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
              <CheckCircle2 color={colors.primary} size={22} strokeWidth={3} />
              <Text selectable style={{ color: colors.text, flex: 1, fontSize: 19, fontWeight: "900" }}>
                {store.translate("helperCompletionTitle")}
              </Text>
            </View>
            <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
              {store.translate("helperCompletionBody")}
            </Text>
            {helperCompletionBlocked ? <StatusBanner message={store.translate("helperCompletionPaymentRequired")} /> : null}
            {canStartTask ? (
              <AHButton
                label={isStartingTask ? store.translate("startingTask") : store.translate("startTask")}
                loading={isStartingTask}
                icon={<PlayCircle color={colors.surface} size={18} strokeWidth={3} />}
                onPress={startTask}
              />
            ) : null}
            {canRequestPaymentRelease ? (
              <AHButton
                label={store.translate("completeTaskRequestRelease")}
                loading={store.isSubmitting}
                icon={<CheckCircle2 color={colors.surface} size={18} strokeWidth={3} />}
                onPress={requestPaymentRelease}
              />
            ) : null}
            {task.status === "payment_requested" ? <StatusBanner tone="success" message={store.translate("helperReleaseAlreadyRequested")} /> : null}
          </Card>
        ) : null}

        <SectionTitle
          title={store.translate("offers")}
          subtitle={store.translate(isOwnTask ? "offerBoardTaskerSubtitle" : "offerBoardHelperSubtitle")}
        />
        {!isOwnTask && (task.offers || []).length !== visibleOffers.length ? <StatusBanner message={store.translate("myOfferOnlyNotice")} /> : null}
        {isOwnTask && acceptableOffers.length > 0 ? (
          <Card>
            <SectionTitle title={store.translate("chooseHelper")} subtitle={store.translate("chooseHelperSubtitle")} />
            <View style={{ gap: 8 }}>
              {acceptableOffers.map((offer) => {
                const helper = store.state.helpers.find((item) => item.id === offer.helperId);
                const isSelected = selectedOfferId === offer.id;
                return (
                  <View
                    key={offer.id}
                    style={{
                      backgroundColor: isSelected ? colors.surfaceWarm : colors.surface,
                      borderColor: isSelected ? colors.accent : colors.border,
                      borderRadius: 8,
                      borderWidth: isSelected ? 2 : 1,
                      gap: 10,
                      padding: 12
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setSelectedOfferId(offer.id)}
                      style={{
                        alignItems: "center",
                        flexDirection: "row",
                        gap: 10
                      }}
                    >
                      {helper?.avatarURL ? (
                        <Image source={{ uri: helper.avatarURL }} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 26, height: 52, width: 52 }} />
                      ) : (
                        <View style={{ alignItems: "center", backgroundColor: colors.surfaceWarm, borderRadius: 26, height: 52, justifyContent: "center", width: 52 }}>
                          <Text style={{ color: colors.accentDark, fontSize: 18, fontWeight: "900" }}>
                            {(helper?.name || offer.helperName || "H").trim().charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} numberOfLines={1}>
                          {helper?.name || offer.helperName}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }} numberOfLines={1}>
                          ★ {Number(helper?.rating || 0).toFixed(1)} · {Number(helper?.reviewCount ?? helper?.reviews?.length ?? 0)} {store.translate("reviews")}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
                          {store.translate("responseSpeed")}: {helper?.responseRate ? `${helper.responseRate}%` : store.translate("notAvailable")}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "900" }}>
                          {money(offer.amount)}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>
                          {offer.status}
                        </Text>
                      </View>
                    </Pressable>
                    <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                      {offer.message}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <AHButton
                          label={isSelected ? store.translate("selected") : store.translate("choose")}
                          tone={isSelected ? "accent" : "secondary"}
                          onPress={() => setSelectedOfferId(offer.id)}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AHButton
                          label={store.translate("profile")}
                          tone="secondary"
                          onPress={() => openHelperProfile(helper?.id || offer.helperId, helper?.name || offer.helperName, offer.id)}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
            {!selectedOffer ? <StatusBanner message={store.translate("selectHelperBeforeAccepting")} /> : null}
            <AHButton
              label={selectedOffer ? `${store.translate("acceptSelectedOffer")}: ${selectedOffer.helperName}` : store.translate("acceptSelectedOffer")}
              tone="accent"
              loading={store.isSubmitting}
              disabled={!selectedOffer}
              onPress={() => selectedOffer ? setPreAcceptOffer(selectedOffer) : Alert.alert(store.translate("chooseHelper"), store.translate("selectHelperBeforeAccepting"), [{ text: store.translate("done") }])}
            />
          </Card>
        ) : null}
        {visibleOffers.length ? (
          visibleOffers.map((offer) => {
            const helper = store.state.helpers.find((item) => item.id === offer.helperId);
            const helperUser = store.state.users.find((item) => item.id === helper?.userId);
            const canAcceptThisOffer = canAcceptOffers && offer.status === "pending";
            const canCounterThisOffer = canCounterOffer(task, offer, isOwnTask, store.currentHelperIds);
            return (
              <Card key={offer.id}>
                <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => openHelperProfile(helper?.id || offer.helperId, helper?.name || offer.helperName, offer.id)}
                    style={{ alignItems: "center", flex: 1, flexDirection: "row", gap: 10, paddingRight: 10 }}
                  >
                    {helper?.avatarURL ? (
                      <Image
                        source={{ uri: helper.avatarURL }}
                        style={{ borderRadius: 18, height: 36, width: 36 }}
                      />
                    ) : (
                      <View
                        style={{
                          alignItems: "center",
                          backgroundColor: colors.surfaceWarm,
                          borderRadius: 18,
                          height: 36,
                          justifyContent: "center",
                          width: 36
                        }}
                      >
                        <Text style={{ color: colors.accent, fontSize: 14, fontWeight: "900" }}>
                          {(helper?.name || offer.helperName).trim().charAt(0).toUpperCase() || "H"}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
                        {helper?.name || offer.helperName}
                      </Text>
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>
                        {store.translate("helperProfile")}
                      </Text>
                    </View>
                  </Pressable>
                  <Text selectable style={{ color: colors.primary, fontSize: 17, fontWeight: "900" }}>
                    {money(offer.amount)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <OfferMiniStat label={store.translate("rating")} value={helper?.rating ? helper.rating.toFixed(1) : store.translate("notAvailable")} />
                  <OfferMiniStat label={store.translate("completionRate")} value={helper?.completionRate ? `${Math.round(Number(helper.completionRate))}%` : helper?.completedTasks ? "100%" : store.translate("notAvailable")} />
                  <OfferMiniStat label={store.translate("jobsCompleted")} value={helper?.completedTasks || 0} />
                </View>
                <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>
                  {offer.message}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(helper?.verifiedBadges || []).slice(0, 3).map((badge) => (
                    <Pill key={badge} label={badge} />
                  ))}
                  {(helper?.profileMedia || helperUser?.profileMedia || []).length ? (
                    <Pill label={`${(helper?.profileMedia || helperUser?.profileMedia || []).length} ${store.translate("portfolio")}`} />
                  ) : null}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <AHButton
                      label={store.translate("helperProfile")}
                      tone="secondary"
                      onPress={() => openHelperProfile(helper?.id || offer.helperId, helper?.name || offer.helperName, offer.id)}
                    />
                  </View>
                  {canAcceptThisOffer ? (
                    <View style={{ flex: 1 }}>
                      <AHButton
                        label={selectedOfferId === offer.id ? store.translate("acceptThisHelper") : store.translate("chooseThisHelper")}
                        loading={store.isSubmitting && selectedOfferId === offer.id}
                        tone={selectedOfferId === offer.id ? "accent" : "secondary"}
                        onPress={() => {
                          setSelectedOfferId(offer.id);
                          setPreAcceptOffer(offer);
                        }}
                      />
                    </View>
                  ) : null}
                </View>
                <CounterOfferTrail offer={offer} translate={store.translate} />
                <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
                  {offer.status}
                </Text>
                <HelperTrustCard helper={helper} user={helperUser} />
                {isOwnTask ? (
                  <ReviewsPreview
                    title={store.translate("recentReviews")}
                    reviews={helper?.reviews || []}
                    emptyText={store.translate("noReviewsYet")}
                  />
                ) : null}
                <FeeBreakdownCard breakdown={offerFeeBreakdown(offer)} compact title={store.translate("feeBreakdown")} />
                {canAcceptThisOffer ? <StatusBanner message={store.translate("selectHelperBeforeAccepting")} /> : null}
                {isOwnTask && offer.status === "pending" && offer.lastCounterBy === "tasker" ? (
                  <StatusBanner message={store.translate("waitingForHelperResponse")} />
                ) : null}
                {!isOwnTask && offer.status === "pending" && offer.lastCounterBy === "helper" ? (
                  <StatusBanner message={store.translate("waitingForTaskerDecision")} />
                ) : null}
                {canCounterThisOffer ? (
                  <>
                    <StatusBanner message={store.translate("counterOfferRule")} />
                    <AHButton
                      label={store.translate("counterOffer")}
                      icon={<ArrowLeftRight color={colors.primary} size={18} strokeWidth={3} />}
                      tone="secondary"
                      onPress={() => openCounterOffer(offer)}
                    />
                  </>
                ) : null}
                {counterOfferId === offer.id ? (
                  <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, gap: 10, padding: 12 }}>
                    <TextField
                      label={store.translate("counterAmount")}
                      keyboardType="number-pad"
                      value={counterDraft.amount}
                      onChangeText={(value) => setCounterDraft((current) => ({ ...current, amount: value }))}
                      onFocus={focusOfferComposer}
                      placeholder="95"
                    />
                    {counterAmountError ? <StatusBanner tone="error" message={counterAmountError} /> : null}
                    <TextField
                      label={store.translate("counterMessage")}
                      value={counterDraft.message}
                      onChangeText={(value) => setCounterDraft((current) => ({ ...current, message: value }))}
                      onFocus={focusOfferComposer}
                      multiline
                    />
                    {counterMessageError ? <StatusBanner tone="error" message={counterMessageError} /> : null}
                    <AHButton
                      label={store.translate("sendCounterOffer")}
                      disabled={!counterFormReady}
                      loading={store.isSubmitting}
                      onPress={() => submitCounterOffer(offer)}
                    />
                  </View>
                ) : null}
              </Card>
            );
          })
        ) : (
          <StatusBanner message={store.translate(isOwnTask ? "noOffersYet" : "noVisibleOffersForHelper")} />
        )}

        {!isOwnTask ? (
          <>
            <SectionTitle title={store.translate("sendAnOffer")} subtitle={store.translate("sendAnOfferSubtitle")} />
            {!store.isAuthenticated ? <StatusBanner tone="error" message={store.translate("logInBeforeOffer")} /> : null}
            {currentHelperOffer ? <StatusBanner tone="success" message={store.translate("offerAlreadySent")} /> : null}
            {!["open", "offer_received"].includes(task.status) ? (
              <StatusBanner message={store.translate("taskClosedForOffers")} />
            ) : null}
            <Card>
              <TextField
                label={store.translate("amount")}
                keyboardType="number-pad"
                value={draft.amount}
                onChangeText={(value) => setDraft((current) => ({ ...current, amount: value }))}
                onFocus={focusOfferComposer}
                placeholder="95"
              />
              {offerAmountError ? <StatusBanner tone="error" message={offerAmountError} /> : null}
              <FeeBreakdownCard amount={offerPreviewAmount} compact title={store.translate("feeBreakdown")} />
              <TextField
                label={store.translate("message")}
                value={draft.message}
                onChangeText={(value) => setDraft((current) => ({ ...current, message: value }))}
                onFocus={focusOfferComposer}
                placeholder={store.translate("offerMessagePlaceholder")}
                multiline
              />
              {offerMessageError ? <StatusBanner tone="error" message={offerMessageError} /> : null}
              <AHButton label={store.translate("sendOffer")} disabled={!offerFormReady} loading={store.isSubmitting} onPress={submitOffer} />
            </Card>
          </>
        ) : null}

        {canRequestTaskerCancellation || canDeleteTask ? (
          <>
            <SectionTitle title={store.translate("taskActions")} subtitle={store.translate("taskActionsSubtitle")} />
            <Card>
              {canRequestTaskerCancellation ? (
                <>
                  <StatusBanner tone="error" message={store.translate("cancellationRequestRules") || "Cancellation may include a fee depending on timing and task status."} />
                  <AHButton
                    label={store.translate("cancelTask")}
                    loading={store.isSubmitting}
                    icon={<X color={colors.primary} size={18} strokeWidth={3} />}
                    tone="secondary"
                    onPress={confirmCancellationRequest}
                  />
                </>
              ) : null}
              {canDeleteTask ? (
                <>
                  <StatusBanner message={store.translate("deleteTaskBody")} />
                  <AHButton
                    label={store.translate("deleteTask")}
                    loading={isDeletingTask || store.isSubmitting}
                    icon={<Trash2 color={colors.primary} size={18} strokeWidth={3} />}
                    tone="secondary"
                    onPress={confirmDeleteTask}
                  />
                </>
              ) : null}
            </Card>
          </>
        ) : null}

        {task.status === "payment_released" ? (
          <>
            <SectionTitle title={store.translate("ratingsReviews")} subtitle={store.translate("ratingsReviewsSubtitle")} />
            <Card>
              {canReviewHelper ? (
                <AHButton
                  label={store.translate("rateHelper")}
                  icon={<Star color={colors.primary} size={18} strokeWidth={3} />}
                  tone="secondary"
                  onPress={() => setReviewTargetRole("helper")}
                />
              ) : null}
              {canReviewTasker ? (
                <AHButton
                  label={store.translate("rateTasker")}
                  icon={<Star color={colors.primary} size={18} strokeWidth={3} />}
                  tone="secondary"
                  onPress={() => setReviewTargetRole("tasker")}
                />
              ) : null}
              {isOwnTask && !canReviewHelper && (task.reviewedByTaskerAt || task.taskerReviewId) ? (
                <StatusBanner tone="success" message={store.translate("helperReviewSubmitted")} />
              ) : null}
              {isAssignedToCurrentAccount && !canReviewTasker && (task.reviewedByHelperAt || task.helperReviewId) ? (
                <StatusBanner tone="success" message={store.translate("taskerReviewSubmitted")} />
              ) : null}
              {reviewTargetRole ? (
                <ReviewComposer
                  rating={reviewRating}
                  targetRole={reviewTargetRole}
                  comment={reviewComment}
                  isSubmitting={store.isSubmitting}
                  onChangeRating={setReviewRating}
                  onChangeComment={setReviewComment}
                  onCancel={() => setReviewTargetRole(null)}
                  onSubmit={submitTaskReview}
                />
              ) : null}
            </Card>
          </>
        ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <AcceptOfferConfirmModal
        offer={preAcceptOffer}
        task={task}
        visible={Boolean(preAcceptOffer)}
        onClose={() => setPreAcceptOffer(null)}
        onConfirm={() => preAcceptOffer ? acceptOffer(preAcceptOffer.id) : undefined}
        onOpenHelperProfile={(helperId) => {
          setPreAcceptOffer(null);
          openHelperProfile(helperId, preAcceptOffer?.helperName, preAcceptOffer?.id);
        }}
      />
      <TaskLocationMapModal visible={showMapPreview} task={task} onClose={() => setShowMapPreview(false)} />
      <Modal visible={Boolean(previewPhoto)} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={{ alignItems: "center", backgroundColor: "rgba(0,0,0,0.9)", flex: 1, justifyContent: "center", padding: 16 }}>
          <Pressable accessibilityRole="button" onPress={() => setPreviewPhoto(null)} style={{ position: "absolute", right: 18, top: 52, zIndex: 2 }}>
            <X color={colors.surface} size={30} strokeWidth={3} />
          </Pressable>
          {previewPhoto ? (
            <Image source={{ uri: previewPhoto }} resizeMode="contain" style={{ height: "86%", width: "100%" }} />
          ) : null}
        </View>
      </Modal>
      {challenge}
    </>
  );
}

function AcceptOfferConfirmModal({
  offer,
  onClose,
  onConfirm,
  onOpenHelperProfile,
  task,
  visible
}: {
  offer: Offer | null;
  onClose: () => void;
  onConfirm: () => void;
  onOpenHelperProfile: (helperId: string) => void;
  task: HelperTask;
  visible: boolean;
}) {
  const store = useAppStore();
  const helper = offer ? store.state.helpers.find((item) => item.id === offer.helperId) : null;
  const helperUser = helper ? store.state.users.find((item) => item.id === helper.userId) : null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={{ backgroundColor: "rgba(10,20,35,0.42)", flex: 1, justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 12, maxHeight: "88%", padding: spacing.screen }}>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <SectionTitle title={store.translate("confirmHelperSelection")} subtitle={store.translate("confirmHelperSelectionBody")} />
            <Pressable accessibilityRole="button" onPress={onClose} style={{ padding: 8 }}>
              <X color={colors.text} size={22} />
            </Pressable>
          </View>
          {offer ? (
            <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
              <Card>
                <View style={{ alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" }}>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => onOpenHelperProfile(helper?.id || offer.helperId)}
                    style={{ flex: 1, gap: 4 }}
                  >
                    <Text selectable style={{ color: colors.text, fontSize: 19, fontWeight: "900" }}>
                      {helper?.name || offer.helperName}
                    </Text>
                    <Text selectable style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }}>
                      {store.translate("viewHelperProfile")}
                    </Text>
                  </Pressable>
                  <Text selectable style={{ color: colors.primary, fontSize: 20, fontWeight: "900" }}>
                    {money(offer.amount)}
                  </Text>
                </View>
                <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>
                  {offer.message}
                </Text>
              </Card>
              <HelperTrustCard helper={helper} user={helperUser} />
              <FeeBreakdownCard breakdown={offerFeeBreakdown(offer)} amount={offer.amount || task.budget} compact title={store.translate("feeBreakdown")} />
              <StatusBanner message={store.translate("confirmOfferPaymentNextStep")} />
              <AHButton
                label={`${store.translate("confirmAcceptOffer")}: ${helper?.name || offer.helperName}`}
                loading={store.isSubmitting}
                onPress={onConfirm}
              />
              <AHButton label={store.translate("cancel")} tone="secondary" onPress={onClose} />
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function TaskPhotoCarousel({
  onOpenPhoto,
  onSelect,
  photos,
  selectedIndex,
  title
}: {
  onOpenPhoto: (source: string) => void;
  onSelect: (index: number) => void;
  photos: string[];
  selectedIndex: number;
  title: string;
}) {
  const cleanPhotos = photos.map((item) => String(item || "").trim()).filter(Boolean);
  const [carouselWidth, setCarouselWidth] = React.useState(0);
  const carouselRef = React.useRef<ScrollView>(null);
  const safeIndex = Math.min(Math.max(selectedIndex, 0), Math.max(cleanPhotos.length - 1, 0));
  const activePhoto = cleanPhotos[safeIndex];
  React.useEffect(() => {
    if (carouselWidth > 0) {
      carouselRef.current?.scrollTo({ x: safeIndex * carouselWidth, animated: true });
    }
  }, [carouselWidth, safeIndex]);
  if (!activePhoto) return null;
  function updatePhotoIndex(event: { nativeEvent: { contentOffset: { x: number } } }) {
    if (!carouselWidth) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
    onSelect(Math.min(Math.max(nextIndex, 0), cleanPhotos.length - 1));
  }
  return (
    <Card>
      <View onLayout={(event) => setCarouselWidth(event.nativeEvent.layout.width)} style={{ borderRadius: 14, height: 210, overflow: "hidden" }}>
        <ScrollView
          ref={carouselRef}
          horizontal
          onMomentumScrollEnd={updatePhotoIndex}
          pagingEnabled
          scrollEnabled={cleanPhotos.length > 1}
          showsHorizontalScrollIndicator={false}
          style={{ height: "100%" }}
        >
          {cleanPhotos.map((photo, index) => (
            <Pressable
              accessibilityLabel={`${title} photo ${index + 1}`}
              accessibilityRole="imagebutton"
              key={`${photo}-hero-${index}`}
              onPress={() => onOpenPhoto(photo)}
              style={{ height: "100%", width: carouselWidth || 320 }}
            >
              <Image
                accessibilityLabel={`${title} photo ${index + 1}`}
                resizeMode="cover"
                source={{ uri: photo }}
                style={{ backgroundColor: colors.surfaceAlt, height: "100%", width: "100%" }}
              />
            </Pressable>
          ))}
        </ScrollView>
        <View
          style={{
            backgroundColor: "rgba(15,23,42,0.58)",
            borderRadius: 999,
            bottom: 12,
            paddingHorizontal: 10,
            paddingVertical: 6,
            position: "absolute",
            right: 12
          }}
        >
          <Text style={{ color: colors.surface, fontSize: 12, fontWeight: "900" }}>
            {safeIndex + 1}/{cleanPhotos.length}
          </Text>
        </View>
      </View>
      {cleanPhotos.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {cleanPhotos.map((photo, index) => (
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityState={{ selected: safeIndex === index }}
              key={`${photo}-${index}`}
              onPress={() => onSelect(index)}
              style={{
                borderColor: safeIndex === index ? colors.accent : colors.border,
                borderRadius: 10,
                borderWidth: safeIndex === index ? 2 : 1,
                height: 56,
                overflow: "hidden",
                width: 70
              }}
            >
              <Image source={{ uri: photo }} resizeMode="cover" style={{ height: "100%", width: "100%" }} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </Card>
  );
}

function getPrimaryTaskActionContent(action: PrimaryTaskActionKey, translate: (key: string) => string) {
  if (action === "choose_helper") {
    return {
      title: translate("chooseHelper"),
      body: translate("chooseHelperSubtitle"),
      label: translate("reviewOffers"),
      tone: "accent" as const
    };
  }
  if (action === "pay") {
    return {
      title: translate("paySecureFunds"),
      body: translate("paySecureFundsBody"),
      label: translate("paySecureFunds"),
      tone: "primary" as const
    };
  }
  if (action === "start") {
    return {
      title: translate("startTask"),
      body: translate("contactHelperNowBody"),
      label: translate("startTask"),
      tone: "primary" as const
    };
  }
  if (action === "request_release") {
    return {
      title: translate("completeTaskRequestRelease"),
      body: translate("helperCompletionBody"),
      label: translate("completeTaskRequestRelease"),
      tone: "primary" as const
    };
  }
  if (action === "release") {
    return {
      title: translate("completeReleasePayment"),
      body: translate("confirmReleaseWarning"),
      label: translate("completeReleasePayment"),
      tone: "accent" as const
    };
  }
  if (action === "contact") {
    return {
      title: translate("contactHelperNow"),
      body: translate("contactHelperNowBody"),
      label: translate("openChat"),
      tone: "secondary" as const
    };
  }
  return {
    title: translate("sendAnOffer"),
    body: translate("sendAnOfferSubtitle"),
    label: translate("makeOffer"),
    tone: "accent" as const
  };
}

function ReviewComposer({
  comment,
  isSubmitting,
  onCancel,
  onChangeComment,
  onChangeRating,
  onSubmit,
  rating,
  targetRole
}: {
  comment: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onChangeComment: (value: string) => void;
  onChangeRating: (value: number) => void;
  onSubmit: () => void;
  rating: number;
  targetRole: TaskReviewTargetRole;
}) {
  const store = useAppStore();
  return (
    <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, gap: 12, padding: 12 }}>
      <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
        {store.translate(targetRole === "helper" ? "rateHelper" : "rateTasker")}
      </Text>
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
          {store.translate("selectRating")}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              onPress={() => onChangeRating(value)}
              style={{
                alignItems: "center",
                backgroundColor: value <= rating ? colors.accent : colors.surface,
                borderColor: colors.border,
                borderRadius: 8,
                borderWidth: 1,
                height: 42,
                justifyContent: "center",
                width: 42
              }}
            >
              <Star color={value <= rating ? colors.surface : colors.muted} fill={value <= rating ? colors.surface : "transparent"} size={21} />
            </Pressable>
          ))}
        </View>
      </View>
      <TextField
        label={store.translate("reviewComment")}
        value={comment}
        onChangeText={onChangeComment}
        placeholder={store.translate("reviewCommentPlaceholder")}
        multiline
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AHButton label={store.translate("cancel")} tone="secondary" onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <AHButton label={store.translate("submitReview")} loading={isSubmitting} onPress={onSubmit} />
        </View>
      </View>
    </View>
  );
}

function TaskNextStepCard({ task }: { task: HelperTask }) {
  const store = useAppStore();
  const key = nextStepKeyForTask(task);
  return (
    <Card tone={["nextStepDisputed", "nextStepCancelRequested", "nextStepContentReview"].includes(key) ? "warm" : undefined}>
      <SectionTitle title={store.translate("taskNextStep")} subtitle={store.translate(key)} />
      <TaskProgressStrip task={task} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pill label={store.translate(taskStatusLabel(task.status))} />
        <Pill label={`${store.translate("paymentStatus")}: ${formatPlainStatus(task.paymentStatus || "unpaid")}`} />
        <Pill label={`${store.translate("payoutSetup")}: ${formatPlainStatus(task.payoutStatus || "not_requested")}`} />
      </View>
    </Card>
  );
}

function TaskProgressStrip({ task }: { task: HelperTask }) {
  const paymentStatus = String(task.paymentStatus || "").toLowerCase();
  const steps = [
    { label: "Offer", done: Boolean(task.acceptedOfferId || task.assignedHelperId || task.pendingHelperId) },
    { label: "Payment", done: Boolean(task.paymentSecuredAt || ["secured", "paid", "released"].includes(paymentStatus)) },
    { label: "Start", done: Boolean(task.startedAt || ["in_progress", "payment_requested", "completed", "payment_released"].includes(task.status)) },
    { label: "Complete", done: ["payment_requested", "completed", "payment_released"].includes(task.status) },
    { label: "Release", done: ["payment_released"].includes(task.status) || paymentStatus === "released" },
    { label: "Review", done: Boolean(task.reviewedByTaskerAt || task.reviewedByHelperAt || task.taskerReviewId || task.helperReviewId) }
  ];
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {steps.map((step) => (
          <View key={step.label} style={{ alignItems: "center", flex: 1, gap: 4 }}>
            <View style={{ backgroundColor: step.done ? colors.primary : colors.surfaceAlt, borderColor: step.done ? colors.primary : colors.border, borderRadius: 999, borderWidth: 1, height: 18, width: 18 }} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62} style={{ color: step.done ? colors.primaryDark : colors.muted, fontSize: 10, fontWeight: "900", textAlign: "center" }}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: colors.border, borderRadius: 999, height: 3, overflow: "hidden" }}>
        <View style={{ backgroundColor: colors.primary, height: 3, width: `${Math.round((steps.filter((step) => step.done).length / steps.length) * 100)}%` }} />
      </View>
    </View>
  );
}

function nextStepKeyForTask(task: HelperTask) {
  switch (task.status) {
    case "open":
    case "offer_received":
      return "nextStepOpenTask";
    case "awaiting_payment":
      return "nextStepAwaitingPayment";
    case "payment_secured":
    case "assigned":
      return "nextStepPaymentSecured";
    case "in_progress":
      return "nextStepInProgress";
    case "payment_requested":
      return "nextStepPaymentRequested";
    case "payment_released":
    case "completed":
      return "nextStepPaymentReleased";
    case "cancel_requested":
      return "nextStepCancelRequested";
    case "cancelled":
    case "auto_cancelled":
      return "nextStepCancelled";
    case "disputed":
      return "nextStepDisputed";
    case "refunded":
      return "nextStepRefunded";
    case "content_review":
    case "rejected_by_moderation":
      return "nextStepContentReview";
    default:
      return "nextStepDefault";
  }
}

function formatPlainStatus(value: string) {
  const normalized = String(value || "-").replace(/[_-]+/g, " ").trim();
  return normalized ? normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "-";
}

function ReviewsPreview({ title, reviews, emptyText }: { title: string; reviews: Review[]; emptyText: string }) {
  if (!reviews.length) {
    return <StatusBanner message={emptyText} />;
  }
  return (
    <View style={{ gap: 8 }}>
      <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>
        {title}
      </Text>
      {reviews.slice(0, 3).map((review) => (
        <View key={review.id} style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: 4, paddingTop: 8 }}>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <Text selectable numberOfLines={1} style={{ color: colors.text, flex: 1, fontSize: 13, fontWeight: "900" }}>
              {review.authorName}
            </Text>
            <Text selectable style={{ color: colors.accent, fontSize: 12, fontWeight: "900" }}>
              {Number(review.rating || 0).toFixed(1)} ★
            </Text>
          </View>
          {review.comment ? (
            <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
              {review.comment}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function TaskLocationMapModal({ visible, task, onClose }: { visible: boolean; task: HelperTask; onClose: () => void }) {
  const store = useAppStore();
  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView edges={["top", "bottom"]} style={{ backgroundColor: colors.background, flex: 1 }}>
        <View style={{ flex: 1 }}>
          <TaskMapPreview tasks={[task]} expanded fullScreen onExpand={onClose} />
          <View
            style={{
              alignItems: "center",
              backgroundColor: "rgba(246, 252, 250, 0.94)",
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
              flexDirection: "row",
              gap: 12,
              left: 0,
              padding: spacing.screen,
              position: "absolute",
              right: 0,
              top: 0,
              zIndex: 30,
              elevation: 16
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={store.translate("close")}
              onPress={onClose}
              style={{ alignItems: "center", backgroundColor: colors.surface, borderRadius: 999, height: 44, justifyContent: "center", width: 44 }}
            >
              <ChevronLeft color={colors.primaryDark} size={26} strokeWidth={3} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <SectionTitle title={store.translate("mapPreview")} subtitle={`${task.suburb}, ${task.state}`} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={store.translate("close")}
              onPress={onClose}
              style={{ alignItems: "center", backgroundColor: colors.surface, borderRadius: 999, height: 44, justifyContent: "center", width: 44 }}
            >
              <X color={colors.primaryDark} size={22} strokeWidth={3} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function canCounterOffer(task: HelperTask, offer: Offer, isOwnTask: boolean, currentHelperIds: string[]) {
  if (task.status !== "open" || offer.status !== "pending") return false;
  if (isOwnTask) {
    return !offer.taskerCounterAt && offer.lastCounterBy !== "tasker";
  }
  if (currentHelperIds.includes(offer.helperId)) {
    return Boolean(offer.taskerCounterAt) && !offer.helperCounterAt && offer.lastCounterBy !== "helper";
  }
  return false;
}

function OfferMiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View
      style={{
        backgroundColor: colors.surfaceAlt,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flex: 1,
        gap: 3,
        minHeight: 58,
        padding: 8
      }}
    >
      <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 10, fontWeight: "900" }}>
        {label}
      </Text>
      <Text selectable numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>
        {value}
      </Text>
    </View>
  );
}

function validateOfferAmount(amount: string, translate: (key: string) => string) {
  const value = Number(String(amount || "").trim());
  if (!Number.isFinite(value) || value < 5) return translate("offerAmountTooLow");
  return null;
}

function validateOfferMessage(message: string, translate: (key: string) => string) {
  if (String(message || "").trim().length < 10) return translate("offerMessageTooShort");
  return null;
}

function CounterOfferTrail({ offer, translate }: { offer: Offer; translate: (key: string) => string }) {
  const entries = [
    offer.originalAmount ? `${translate("offers")}: ${money(offer.originalAmount)}` : null,
    offer.taskerCounterAt
      ? `${translate("taskerCounter")}: ${money(offer.taskerCounterAmount ?? offer.amount)}${offer.taskerCounterMessage ? ` - ${offer.taskerCounterMessage}` : ""}`
      : null,
    offer.helperCounterAt
      ? `${translate("helperCounter")}: ${money(offer.helperCounterAmount ?? offer.amount)}${offer.helperCounterMessage ? ` - ${offer.helperCounterMessage}` : ""}`
      : null
  ].filter((entry): entry is string => Boolean(entry));

  if (!entries.length) return null;

  return (
    <View style={{ gap: 6 }}>
      {entries.map((entry) => (
        <Text key={entry} selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800", lineHeight: 17 }}>
          {entry}
        </Text>
      ))}
    </View>
  );
}
