import * as React from "react";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { AHButton, Card, TextField } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function FeedbackRoute() {
  const store = useAppStore();
  const [message, setMessage] = React.useState("");
  const saveDraft = async () => {
    await SecureStore.setItemAsync("ah_feedback_draft", message);
    Alert.alert(store.translate("draftSaved"), store.translate("feedbackDraftSaved"));
  };
  return (
    <ParityScreen titleKey="feedback">
      <Card>
        <TextField label={store.translate("feedback")} value={message} onChangeText={setMessage} multiline />
        <AHButton label={store.translate("saveFeedbackDraft")} tone="secondary" onPress={() => void saveDraft()} />
      </Card>
    </ParityScreen>
  );
}
