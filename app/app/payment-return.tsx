import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function PaymentReturnRoute() {
  const router = useRouter();
  const store = useAppStore();
  const { taskId, session_id, sessionId, payment_intent, paymentIntentId } = useLocalSearchParams<{
    taskId?: string | string[];
    session_id?: string | string[];
    sessionId?: string | string[];
    payment_intent?: string | string[];
    paymentIntentId?: string | string[];
  }>();
  const handledRef = React.useRef(false);
  const selectedTaskId = firstParam(taskId);
  const selectedSessionId = firstParam(session_id) || firstParam(sessionId);
  const selectedPaymentIntentId = firstParam(payment_intent) || firstParam(paymentIntentId);
  const missingTaskAlertShownRef = React.useRef(false);

  React.useEffect(() => {
    if (handledRef.current || !store.isAuthenticated || !selectedTaskId) return;
    handledRef.current = true;

    const completeReturn = async () => {
      const error = await store.confirmTaskPayment(selectedTaskId, {
        sessionId: selectedSessionId,
        paymentIntentId: selectedPaymentIntentId
      });
      await store.refreshAll();

      if (error) {
        Alert.alert(store.translate("payment"), error, [
          { text: store.translate("close"), onPress: () => router.replace(`/payment?taskId=${selectedTaskId}`) }
        ]);
        return;
      }

      Alert.alert(store.translate("paymentConfirmed"), store.translate("paymentSecuredContinueTask"), [
        { text: store.translate("contactHelperNow"), onPress: () => router.replace(`/thread/${selectedTaskId}`) },
        { text: store.translate("taskDetail"), onPress: () => router.replace(`/task/${selectedTaskId}`) }
      ]);
    };

    void completeReturn();
  }, [router, selectedPaymentIntentId, selectedSessionId, selectedTaskId, store]);

  React.useEffect(() => {
    if (missingTaskAlertShownRef.current || !store.isAuthenticated || selectedTaskId) return;
    missingTaskAlertShownRef.current = true;
    Alert.alert(store.translate("payment"), store.translate("paymentTaskNotFound"), [
      { text: store.translate("close"), onPress: () => router.replace("/payment") }
    ]);
  }, [router, selectedTaskId, store]);

  return (
    <ParityScreen titleKey="payment">
      <StatusBanner message={store.translate("confirmingPayment")} tone="info" />
    </ParityScreen>
  );
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
