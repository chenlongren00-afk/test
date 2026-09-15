import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, InteractionManager, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{ token?: string; error?: string }>();
  const router = useRouter();
  const store = useAppStore();
  const [message, setMessage] = React.useState(store.translate("loginSuccess"));
  const [didComplete, setDidComplete] = React.useState(false);
  const completeOAuthLogin = store.completeOAuthLogin;
  const translate = store.translate;
  const didStart = React.useRef(false);

  React.useEffect(() => {
    let isMounted = true;
    if (didStart.current) return () => {
      isMounted = false;
    };
    didStart.current = true;

    async function completeLogin() {
      const error = Array.isArray(params.error) ? params.error[0] : params.error;
      const token = Array.isArray(params.token) ? params.token[0] : params.token;

      if (error) {
        if (isMounted) setMessage(error);
        return;
      }

      if (!token) {
        if (isMounted) setMessage("Missing login token.");
        return;
      }

      const result = await completeOAuthLogin(token);
      if (!isMounted) return;
      setMessage(result || translate("loginSuccess"));
      if (!result) {
        setDidComplete(true);
        InteractionManager.runAfterInteractions(() => {
          router.replace("/");
        });
        setTimeout(() => router.replace("/"), 250);
      }
    }

    void completeLogin();

    return () => {
      isMounted = false;
    };
  }, [completeOAuthLogin, params.error, params.token, router, translate]);

  if (didComplete) return <Redirect href="/" />;

  return (
    <SafeAreaView style={{ alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: 24 }}>
      <ActivityIndicator color={colors.primary} size="large" />
      <View style={{ height: 16 }} />
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "center" }}>{message}</Text>
    </SafeAreaView>
  );
}
