import * as React from "react";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { AHButton, Card, TextField } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function RefundRequestRoute() {
  const store = useAppStore();
  const [reason, setReason] = React.useState("");
  const saveDraft = async () => {
    await SecureStore.setItemAsync("ah_refund_request_draft", reason);
    Alert.alert(store.translate("draftSaved"), store.translate("refundDraftSaved"));
  };
  return (
    <ParityScreen titleKey="refundRequest">
      <Card>
        <TextField label={store.translate("refundReason")} value={reason} onChangeText={setReason} multiline />
        <AHButton label={store.translate("saveRefundDraft")} tone="secondary" onPress={() => void saveDraft()} />
      </Card>
    </ParityScreen>
  );
}
