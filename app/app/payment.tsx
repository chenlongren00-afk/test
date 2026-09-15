import * as React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Linking, Text, View } from "react-native";
import { Lock, MessageCircle } from "lucide-react-native";

import { ParityScreen, StatRow } from "@/components/ParityScreen";
import { AHButton, Card, FeeBreakdownCard, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

export default function PaymentRoute() {
  const store = useAppStore();
  const router = useRouter();
  const { taskId, session_id, sessionId, payment_intent, paymentIntentId } = useLocalSearchParams<{
    taskId?: string;
    session_id?: string;
    sessionId?: string;
    payment_intent?: string;
    paymentIntentId?: string;
  }>();
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const handledReturnRef = React.useRef<string | null>(null);
  const selectedTaskId = firstParam(taskId);
  const paymentTask = store.state.tasks.find((task) =>
    store.currentAccountUserIds.includes(task.createdBy) &&
    (selectedTaskId ? task.id === selectedTaskId : ["awaiting_payment", "payment_secured", "assigned", "in_progress", "payment_requested"].includes(task.status))
  );
  const paymentStatus = String(paymentTask?.paymentStatus || "").toLowerCase();
  const contactUnlocked = Boolean(
    paymentTask?.contactUnlocked ||
    paymentTask?.paymentSecuredAt ||
    ["secured", "paid", "released"].includes(paymentStatus) ||
    paymentTask?.status === "payment_secured"
  );
  const hasAcceptedOffer = Boolean(
    paymentTask?.acceptedOfferId ||
    paymentTask?.offers?.some((offer) => offer.status === "accepted")
  );
  const canOpenCheckout = Boolean(
    paymentTask &&
    hasAcceptedOffer &&
    !contactUnlocked &&
    (
      paymentTask.status === "awaiting_payment" ||
      ["awaiting_payment", "pending", "unpaid", "none", "requires_payment_method", "requires_action", "failed"].includes(paymentStatus)
    )
  );
  const returnSessionId = firstParam(session_id) || firstParam(sessionId);
  const returnPaymentIntentId = firstParam(payment_intent) || firstParam(paymentIntentId);
  const paymentBanner = contactUnlocked
    ? store.translate("contactHelperNowBody")
    : !paymentTask
      ? store.translate("paymentTaskNotFound")
      : !hasAcceptedOffer
        ? store.translate("paymentAcceptedOfferRequired")
        : store.translate("androidPaymentSetupBody");

  async function openCheckout() {
    if (!paymentTask) {
      Alert.alert(store.translate("payment"), store.translate("paymentTaskNotFound"));
      return;
    }
    const result = await store.createTaskCheckoutSession(paymentTask.id);
    if (result.error || !result.url) {
      Alert.alert(store.translate("payment"), result.error || store.translate("somethingWentWrong"));
      return;
    }
    setStatusMessage(store.translate("secureCheckoutOpened"));
    const opened = await Linking.openURL(result.url).then(() => true).catch(() => false);
    if (!opened) {
      Alert.alert(store.translate("payment"), store.translate("checkoutOpenFailed"));
    }
  }

  const confirmReturnedPayment = React.useCallback(async (input: { sessionId?: string; paymentIntentId?: string }) => {
    if (!paymentTask) return;
    const marker = `${paymentTask.id}:${input.sessionId || ""}:${input.paymentIntentId || ""}`;
    if (handledReturnRef.current === marker) return;
    handledReturnRef.current = marker;
    setStatusMessage(store.translate("confirmingPayment"));
    const error = await store.confirmTaskPayment(paymentTask.id, input);
    if (error) {
      setStatusMessage(error);
      return;
    }
    setStatusMessage(store.translate("paymentSecuredContinueTask"));
    await store.refreshAll();
    Alert.alert(store.translate("paymentConfirmed"), store.translate("paymentSecuredContinueTask"), [
      {
        text: store.translate("contactHelperNow"),
        onPress: () => router.replace(`/thread/${paymentTask.id}`)
      },
      {
        text: store.translate("taskDetail"),
        onPress: () => router.replace(`/task/${paymentTask.id}`)
      }
    ]);
  }, [paymentTask, router, store]);

  React.useEffect(() => {
    if (!paymentTask) return;
    if (returnSessionId || returnPaymentIntentId) {
      const timer = setTimeout(() => {
        void confirmReturnedPayment({ sessionId: returnSessionId, paymentIntentId: returnPaymentIntentId });
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [confirmReturnedPayment, paymentTask, returnSessionId, returnPaymentIntentId]);

  React.useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const parsed = parsePaymentReturnURL(url);
      if (!parsed || (paymentTask && parsed.taskId && parsed.taskId !== paymentTask.id)) return;
      void confirmReturnedPayment({ sessionId: parsed.sessionId, paymentIntentId: parsed.paymentIntentId });
    });
    return () => {
      subscription.remove();
    };
  }, [confirmReturnedPayment, paymentTask]);

  return (
    <ParityScreen titleKey="payment">
      <Card>
        <StatRow
          label={store.translate("paymentStatus")}
          value={contactUnlocked ? store.translate("notificationPaymentSecured") : store.translate("setupRequired")}
        />
        <StatusBanner message={paymentBanner} tone={contactUnlocked ? "success" : "info"} />
        {statusMessage ? <StatusBanner message={statusMessage} tone={contactUnlocked ? "success" : "info"} /> : null}
        {canOpenCheckout ? (
          <AHButton
            label={store.isSubmitting ? store.translate("openingCheckout") : store.translate("paySecureFunds")}
            icon={<Lock color={colors.surface} size={18} strokeWidth={3} />}
            loading={store.isSubmitting}
            onPress={() => void openCheckout()}
          />
        ) : null}
        <AHButton label={store.translate("refreshPaymentStatus")} tone="secondary" onPress={() => void store.refreshAll()} />
        {paymentTask && contactUnlocked ? (
          <>
            <AHButton
              label={store.translate("contactHelperNow")}
              icon={<MessageCircle color={colors.surface} size={18} strokeWidth={3} />}
              onPress={() => router.push(`/thread/${paymentTask.id}`)}
            />
          </>
        ) : null}
      </Card>
      <FeeBreakdownCard breakdown={paymentTask?.feeBreakdown} amount={paymentTask?.budget || 0} />
      {paymentTask ? (
        <Card>
          <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>
            {store.translate("receipt")}
          </Text>
          <StatRow label={store.translate("receiptNumber")} value={paymentTask.receiptNumber || store.translate("notAvailable")} />
          <StatRow label={store.translate("paymentReference")} value={paymentTask.stripePaymentIntentId || paymentTask.stripeCheckoutSessionId || store.translate("notAvailable")} />
          <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
            {contactUnlocked ? store.translate("paymentReceiptReadyBody") : store.translate("paymentReceiptPendingBody")}
          </Text>
          <View style={{ gap: 8 }}>
            {paymentTask.receiptUrl ? (
              <AHButton
                label={store.translate("openStripeReceipt")}
                tone="secondary"
                onPress={() => void Linking.openURL(String(paymentTask.receiptUrl))}
              />
            ) : null}
            <AHButton
              label={store.translate("viewTask")}
              tone="secondary"
              onPress={() => router.push(`/task/${paymentTask.id}`)}
            />
          </View>
        </Card>
      ) : null}
    </ParityScreen>
  );
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePaymentReturnURL(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "australianhelper:") return null;
    const routeName = parsed.hostname || parsed.pathname.replace(/^\/+/, "");
    if (!["payment-return", "payment-cancel"].includes(routeName)) return null;
    return {
      taskId: parsed.searchParams.get("taskId") || undefined,
      sessionId: parsed.searchParams.get("session_id") || parsed.searchParams.get("sessionId") || undefined,
      paymentIntentId: parsed.searchParams.get("payment_intent") || parsed.searchParams.get("paymentIntentId") || undefined
    };
  } catch {
    return null;
  }
}
