import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function PaymentCancelRoute() {
  const router = useRouter();
  const store = useAppStore();
  const { taskId } = useLocalSearchParams<{ taskId?: string | string[] }>();
  const selectedTaskId = firstParam(taskId);
  const handledRef = React.useRef(false);

  React.useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    Alert.alert(store.translate("payment"), store.translate("paymentCancelled"), [
      { text: store.translate("close"), onPress: () => router.replace(selectedTaskId ? `/payment?taskId=${selectedTaskId}` : "/payment") }
    ]);
  }, [router, selectedTaskId, store]);

  return (
    <ParityScreen titleKey="payment">
      <StatusBanner message={store.translate("paymentCancelled")} tone="info" />
    </ParityScreen>
  );
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
