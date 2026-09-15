import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyRound } from "lucide-react-native";
import * as React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AHButton, Card, StatusBanner, TextField } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const store = useAppStore();
  const [email, setEmail] = React.useState(firstParam(params.email));
  const [token, setToken] = React.useState(firstParam(params.token));
  const [password, setPassword] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  async function submit() {
    setNotice(null);
    const error = await store.resetPassword({ email, token, password });
    if (!error) {
      setNotice(store.translate("passwordUpdated"));
      router.replace("/");
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colors.background, flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: 16, padding: 18 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}>
              {store.translate("resetPassword")}
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
              {store.translate("resetPasswordBody")}
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
            <TextField
              label={store.translate("resetCode")}
              autoCapitalize="none"
              value={token}
              onChangeText={setToken}
            />
            <TextField
              label={store.translate("newPassword")}
              secureTextEntry
              autoComplete="new-password"
              placeholder={store.translate("passwordPlaceholder")}
              value={password}
              onChangeText={setPassword}
            />
            <AHButton
              label={store.isSubmitting ? store.translate("updatingPassword") : store.translate("updatePassword")}
              loading={store.isSubmitting}
              onPress={submit}
              icon={<KeyRound color="#FFFFFF" size={18} />}
            />
          </Card>

          {store.error ? <StatusBanner tone="error" message={store.error} /> : null}
          {notice ? <StatusBanner tone="success" message={notice} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
