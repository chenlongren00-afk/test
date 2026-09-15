import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import * as React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AHButton, Card, StatusBanner, TextField } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const store = useAppStore();
  const [email, setEmail] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  async function submit() {
    setNotice(null);
    const error = await store.requestPasswordReset(email);
    if (!error) setNotice(store.translate("passwordResetEmailSent"));
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colors.background, flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: 16, padding: 18 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}>
              {store.translate("forgotPassword")}
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
              {store.translate("forgotPasswordBody")}
            </Text>
          </View>

          <Card>
            <TextField
              label={store.translate("email")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <AHButton
              label={store.isSubmitting ? store.translate("sendingResetEmail") : store.translate("sendResetEmail")}
              loading={store.isSubmitting}
              onPress={submit}
              icon={<Mail color="#FFFFFF" size={18} />}
            />
          </Card>

          {store.error ? <StatusBanner tone="error" message={store.error} /> : null}
          {notice ? <StatusBanner tone="success" message={notice} /> : null}

          <AHButton label={store.translate("backToLogin")} tone="secondary" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
