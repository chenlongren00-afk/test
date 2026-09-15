import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Mail, Play } from "lucide-react-native";
import * as React from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiBaseUrl } from "@/api/client";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTurnstileChallenge } from "@/components/TurnstileChallenge";
import { AHButton, Card, Pill, StatusBanner, TextField } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors, radii } from "@/theme/colors";
import type { UserRole } from "@/types/marketplace";

const splashLogo = require("../../assets/splash-logo.png");

function firstOAuthValue(value: unknown) {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : "";
  return typeof value === "string" ? value : "";
}

function parseOAuthCallback(url: string) {
  const parsed = Linking.parse(url);
  const routeParts = [parsed.hostname, parsed.path].filter(Boolean).join("/").split("/");
  const isOAuthCallback = parsed.scheme === "australianhelper" && routeParts.includes("oauth");
  if (!isOAuthCallback) return null;

  let token = firstOAuthValue(parsed.queryParams?.token);
  let error = firstOAuthValue(parsed.queryParams?.error);
  try {
    const callbackURL = new URL(url);
    token = token || callbackURL.searchParams.get("token") || "";
    error = error || callbackURL.searchParams.get("error") || "";
  } catch {
    // expo-linking already parsed the callback above.
  }

  return { token, error };
}

export function LoginGate() {
  const store = useAppStore();
  const router = useRouter();
  const { challenge, runChallenge } = useTurnstileChallenge();
  const [notice, setNotice] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [showEmailForm, setShowEmailForm] = React.useState(false);
  const [activeSocialLogin, setActiveSocialLogin] = React.useState<"google" | null>(null);
  const [auth, setAuth] = React.useState({
    name: "",
    email: "",
    password: "",
    suburb: "",
    role: "both" as UserRole
  });
  const [logoAnim] = React.useState(() => new Animated.Value(0));
  const [wordmarkAnim] = React.useState(() => new Animated.Value(0));
  const [settleAnim] = React.useState(() => new Animated.Value(0));
  const [methodsAnim] = React.useState(() => new Animated.Value(0));
  const [pulseAnim] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleOAuthURL(url);
    });

    void Linking.getInitialURL().then((url) => {
      if (url) void handleOAuthURL(url);
    });

    async function handleOAuthURL(url: string) {
      const callback = parseOAuthCallback(url);
      if (!callback) return;
      const { token, error } = callback;
      if (error) {
        setNotice(error);
        return;
      }
      if (token) {
        const result = await store.completeOAuthLogin(token);
        setNotice(result || store.translate("loginSuccess"));
        return;
      }
      setNotice(store.translate("googleFailed"));
    }

    return () => subscription.remove();
  }, [store]);

  React.useEffect(() => {
    Animated.sequence([
      Animated.spring(logoAnim, {
        toValue: 1,
        damping: 10,
        stiffness: 82,
        mass: 0.9,
        useNativeDriver: true
      }),
      Animated.timing(wordmarkAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start(() => {
      Animated.parallel([
        Animated.spring(settleAnim, {
          toValue: 1,
          damping: 16,
          stiffness: 68,
          mass: 1,
          useNativeDriver: true
        }),
        Animated.timing(methodsAnim, {
          toValue: 1,
          duration: 640,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ]).start();
    });

    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ).start();
  }, [logoAnim, methodsAnim, pulseAnim, settleAnim, wordmarkAnim]);

  async function submitAuth() {
    let antiRobotToken = "";
    if (mode === "register") {
      try {
        antiRobotToken = await runChallenge("register");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : store.translate("securityCheckFailed"));
        return;
      }
    }
    const error =
      mode === "login" ? await store.login(auth.email, auth.password) : await store.register(auth, antiRobotToken);
    if (!error) setNotice(mode === "login" ? store.translate("loginSuccess") : store.translate("accountCreated"));
  }

  async function loginWithGoogle() {
    setActiveSocialLogin("google");
    setNotice(null);
    const startUrl = `${apiBaseUrl}/api/auth/google/start?platform=android&callback_scheme=australianhelper`;
    const opened = await Linking.openURL(startUrl).then(() => true).catch(() => false);
    setActiveSocialLogin(null);
    setNotice(opened ? store.translate("googleOpened") : store.translate("googleFailed"));
  }

  const headerTranslateY = settleAnim.interpolate({ inputRange: [0, 1], outputRange: [-22, -128] });
  const methodsTranslateY = methodsAnim.interpolate({ inputRange: [0, 1], outputRange: [128, 0] });
  const logoScale = logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.74, 1] });
  const logoRotate = logoAnim.interpolate({ inputRange: [0, 1], outputRange: ["-5deg", "0deg"] });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ backgroundColor: colors.splashTeal, flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="none"
          style={{
            alignItems: "center",
            left: 18,
            opacity: showEmailForm ? 0 : 1,
            position: "absolute",
            right: 18,
            top: "24%",
            transform: [{ translateY: headerTranslateY }]
          }}
        >
          <View style={{ alignItems: "center", gap: 18 }}>
            <View style={{ alignItems: "center", height: 188, justifyContent: "center", width: 188 }}>
              {[0, 1, 2].map((index) => (
                <Animated.View
                  key={index}
                  style={{
                    borderColor: "rgba(242, 160, 20, 0.48)",
                    borderRadius: 999,
                    borderWidth: 3,
                    height: 42,
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 0.62, 1],
                      outputRange: [0.76, 0.18, 0]
                    }),
                    position: "absolute",
                    transform: [
                      { translateX: 18 },
                      { translateY: 30 },
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.52 + index * 0.08, 1.95 + index * 0.12]
                        })
                      }
                    ],
                    width: 42
                  }}
                />
              ))}
              <Animated.View style={{ opacity: logoAnim, transform: [{ scale: logoScale }, { rotate: logoRotate }] }}>
                <Image
                  source={splashLogo}
                  resizeMode="contain"
                  style={{
                    height: 164,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.16,
                    shadowRadius: 16,
                    width: 164
                  }}
                />
              </Animated.View>
            </View>

            <Animated.View
              style={{
                alignItems: "center",
                gap: 6,
                opacity: wordmarkAnim,
                transform: [
                  {
                    translateY: wordmarkAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] })
                  }
                ]
              }}
            >
              <Text
                selectable
                adjustsFontSizeToFit
                numberOfLines={1}
                style={{ color: "#FFFFFF", fontSize: 42, fontWeight: "900", letterSpacing: 0 }}
              >
                {store.translate("helper")}
              </Text>
              <Text selectable style={{ color: colors.accent, fontSize: 16, fontWeight: "900", letterSpacing: 0 }}>
                {store.translate("slogan")}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "flex-end",
            padding: 18,
            paddingBottom: 28,
            paddingTop: 300
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ gap: 12, opacity: methodsAnim, transform: [{ translateY: methodsTranslateY }] }}>
            <LanguageSwitcher variant="dark" />

            <AuthButton
              icon={<Play color="#FFFFFF" size={22} />}
              label={activeSocialLogin === "google" ? store.translate("connecting") : store.translate("continueGooglePlay")}
              onPress={loginWithGoogle}
              disabled={store.isSubmitting || Boolean(activeSocialLogin)}
              backgroundColor="#000000"
              color="#FFFFFF"
            />

            <AuthButton
              icon={<GoogleGlyph />}
              label={activeSocialLogin === "google" ? store.translate("connecting") : store.translate("continueGoogle")}
              onPress={loginWithGoogle}
              disabled={store.isSubmitting || Boolean(activeSocialLogin)}
              backgroundColor="#FFFFFF"
              color={colors.text}
              borderColor={colors.border}
            />

            <AuthButton
              icon={<Mail color={colors.primaryDark} size={21} />}
              label={store.translate(showEmailForm ? "hideEmail" : "continueEmail")}
              onPress={() => setShowEmailForm((current) => !current)}
              disabled={store.isSubmitting || Boolean(activeSocialLogin)}
              backgroundColor="rgba(255,255,255,0.92)"
              color={colors.primaryDark}
              borderColor="rgba(255,255,255,0.78)"
            />

            {showEmailForm ? (
              <View style={{ gap: 12, paddingTop: 2 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pill label={store.translate("login")} selected={mode === "login"} onPress={() => setMode("login")} />
                  <Pill label={store.translate("register")} selected={mode === "register"} onPress={() => setMode("register")} />
                </View>
                <Card>
                  {mode === "register" ? (
                    <TextField
                      label={store.translate("name")}
                      value={auth.name}
                      onChangeText={(value) => setAuth((current) => ({ ...current, name: value }))}
                    />
                  ) : null}
                  <TextField
                    label={store.translate("email")}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={auth.email}
                    onChangeText={(value) => setAuth((current) => ({ ...current, email: value }))}
                  />
                  <TextField
                    label={store.translate("password")}
                    secureTextEntry
                    placeholder={store.translate("passwordPlaceholder")}
                    value={auth.password}
                    onChangeText={(value) => setAuth((current) => ({ ...current, password: value }))}
                  />
                  {mode === "login" ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: "/forgot-password" })}
                      style={{ alignSelf: "flex-start", paddingVertical: 2 }}
                    >
                      <Text selectable style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }}>
                        {store.translate("forgotPassword")}
                      </Text>
                    </Pressable>
                  ) : null}
                  {mode === "register" ? (
                    <>
                      <TextField
                        label={store.translate("suburb")}
                        value={auth.suburb}
                        onChangeText={(value) => setAuth((current) => ({ ...current, suburb: value }))}
                      />
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {(["both", "helper", "poster"] as UserRole[]).map((role) => (
                          <Pill
                            key={role}
                            label={roleLabel(role, store.translate)}
                            selected={auth.role === role}
                            onPress={() => setAuth((current) => ({ ...current, role }))}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}
                  <AHButton
                    label={
                      store.isSubmitting
                        ? store.translate(mode === "login" ? "signingIn" : "creatingAccount")
                        : store.translate(mode === "login" ? "login" : "createAccountButton")
                    }
                    loading={store.isSubmitting}
                    onPress={submitAuth}
                  />
                </Card>
              </View>
            ) : (
              <Pressable accessibilityLabel={store.translate("createAccount")} accessibilityRole="button" onPress={() => setShowEmailForm(true)} style={{ alignItems: "center", paddingVertical: 4 }}>
                <Text selectable style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "900" }}>
                  {store.translate("createAccount")}
                </Text>
              </Pressable>
            )}

            {store.error ? <StatusBanner tone="error" message={store.error} /> : null}
            {notice ? <StatusBanner tone={isErrorNotice(notice) ? "error" : "success"} message={notice} /> : null}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      {challenge}
    </SafeAreaView>
  );
}

function AuthButton({
  icon,
  label,
  onPress,
  disabled,
  backgroundColor,
  color,
  borderColor
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  backgroundColor: string;
  color: string;
  borderColor?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor,
        borderColor: borderColor || backgroundColor,
        borderRadius: radii.control,
        borderWidth: 1,
        flexDirection: "row",
        gap: 12,
        justifyContent: "center",
        minHeight: 50,
        opacity: disabled ? 0.62 : 1,
        paddingHorizontal: 16
      }}
    >
      {icon}
      <Text selectable numberOfLines={1} style={{ color, fontSize: 15, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function GoogleGlyph() {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderColor: colors.border,
        borderRadius: 999,
        borderWidth: 1,
        height: 28,
        justifyContent: "center",
        width: 28
      }}
    >
      <Text selectable style={{ color: "#3367D6", fontSize: 17, fontWeight: "900" }}>
        G
      </Text>
    </View>
  );
}

function roleLabel(role: UserRole | undefined, translate: (key: string) => string) {
  if (role === "poster") return translate("poster");
  if (role === "helper") return translate("helperRole");
  return translate("both");
}

function isErrorNotice(notice: string) {
  return notice.includes("could not") || notice.includes("無法") || notice.includes("无法") || notice.includes("Không");
}
