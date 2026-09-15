import * as React from "react";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { AHButton, Card, TextField } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function CancellationRequestRoute() {
  const store = useAppStore();
  const [reason, setReason] = React.useState("");
  const saveDraft = async () => {
    await SecureStore.setItemAsync("ah_cancellation_request_draft", reason);
    Alert.alert(store.translate("draftSaved"), store.translate("requestDraftSaved"));
  };
  return (
    <ParityScreen titleKey="cancellationRequest">
      <Card>
        <TextField label={store.translate("reason")} value={reason} onChangeText={setReason} multiline />
        <AHButton label={store.translate("saveRequestDraft")} tone="secondary" onPress={() => void saveDraft()} />
      </Card>
    </ParityScreen>
  );
}
