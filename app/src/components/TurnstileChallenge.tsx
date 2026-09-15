import * as React from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { useAppStore } from "@/state/app-store";
import { colors, spacing } from "@/theme/colors";

type TurnstileAction =
  | "register"
  | "post_task"
  | "submit_offer"
  | "accept_offer"
  | "counter_offer";

type PendingChallenge = {
  action: TurnstileAction;
  resolve: (token: string) => void;
  reject: (error: Error) => void;
};

export function useTurnstileChallenge() {
  const store = useAppStore();
  const [pending, setPending] = React.useState<PendingChallenge | null>(null);
  const siteKey = store.config.antiRobot?.siteKey || "";
  const challengeUrl = store.config.antiRobot?.challengeUrl || "";
  const enabled = Boolean(store.config.antiRobot?.enforced && siteKey);

  const runChallenge = React.useCallback((action: TurnstileAction) => {
    if (!enabled) return Promise.resolve("");
    return new Promise<string>((resolve, reject) => {
      setPending({ action, resolve, reject });
    });
  }, [enabled]);

  const close = React.useCallback(() => {
    setPending((current) => {
      current?.reject(new Error("Security verification was cancelled."));
      return null;
    });
  }, []);

  const fail = React.useCallback((message = "Security verification could not load. Please check your connection and try again.") => {
    setPending((current) => {
      current?.reject(new Error(message));
      return null;
    });
  }, []);

  const finish = React.useCallback((token: string) => {
    setPending((current) => {
      current?.resolve(token);
      return null;
    });
  }, []);

  const challenge = (
    <TurnstileChallengeModal
      action={pending?.action || "register"}
      challengeUrl={challengeUrl}
      siteKey={siteKey}
      visible={Boolean(pending)}
      onCancel={close}
      onError={fail}
      onToken={finish}
    />
  );

  return { challenge, runChallenge };
}

function TurnstileChallengeModal({
  action,
  challengeUrl,
  siteKey,
  visible,
  onCancel,
  onError,
  onToken
}: {
  action: TurnstileAction;
  challengeUrl: string;
  siteKey: string;
  visible: boolean;
  onCancel: () => void;
  onError: (message?: string) => void;
  onToken: (token: string) => void;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState("Loading security check...");
  const [webViewKey, setWebViewKey] = React.useState(0);
  const source = React.useMemo(() => {
    const url = buildChallengeUrl(challengeUrl, action);
    if (url) return { uri: url };
    return { html: buildTurnstileHtml(siteKey, action), baseUrl: "https://australianhelper.com" };
  }, [action, challengeUrl, siteKey]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === "turnstile-status" && payload.message) {
        setStatusMessage(String(payload.message));
        return;
      }
      if (payload?.type === "turnstile-token" && payload.token) {
        const token = String(payload.token).trim();
        if (token.length < 80) {
          onError("Security verification returned an invalid token. Please try again.");
          return;
        }
        onToken(token);
      }
      if (payload?.type === "turnstile-error") {
        onError(`Security verification could not load${payload.reason ? ` (${payload.reason})` : ""}. Please check your connection and try again.`);
      }
    } catch {
      onError();
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={{
        alignItems: "center",
        backgroundColor: "rgba(16,35,63,0.42)",
        flex: 1,
        justifyContent: "center",
        padding: spacing.screen
      }}>
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 8,
          gap: spacing.gap,
          maxWidth: 440,
          overflow: "hidden",
          padding: spacing.card,
          width: "100%"
        }}>
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>Security check</Text>
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
              Please complete this quick check before continuing.
            </Text>
          </View>
          <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, height: 170, overflow: "hidden" }}>
            {!loaded ? (
              <View style={{ alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 }}>
                <ActivityIndicator color={colors.primary} />
                <Text selectable style={{ color: colors.muted, fontSize: 12, marginTop: 8, textAlign: "center" }}>
                  {statusMessage}
                </Text>
              </View>
            ) : null}
            <WebView
              cacheEnabled
              domStorageEnabled
              javaScriptEnabled
              key={`${action}-${visible ? "open" : "closed"}-${webViewKey}`}
              mixedContentMode="always"
              onError={() => onError()}
              onLoadStart={() => setLoaded(false)}
              onLoadEnd={() => {
                setLoaded(true);
                setStatusMessage("Waiting for Cloudflare verification");
              }}
              onHttpError={() => onError()}
              onMessage={handleMessage}
              originWhitelist={["https://*", "http://*", "about:blank", "about:srcdoc"]}
              sharedCookiesEnabled
              setSupportMultipleWindows={false}
              source={source}
              style={{ backgroundColor: colors.surface, flex: 1 }}
              thirdPartyCookiesEnabled
            />
          </View>
          <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
            {statusMessage}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLoaded(false);
              setStatusMessage("Reloading security check...");
              setWebViewKey((value) => value + 1);
            }}
            style={{ alignItems: "center", borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: 12 }}
          >
            <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "900" }}>Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={{ alignItems: "center", borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: 14 }}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function buildChallengeUrl(challengeUrl: string, action: TurnstileAction) {
  if (!challengeUrl.trim()) return "";
  try {
    const url = new URL(challengeUrl);
    url.searchParams.set("action", action);
    url.searchParams.set("platform", "android");
    return url.toString();
  } catch {
    return "";
  }
}

function buildTurnstileHtml(siteKey: string, action: TurnstileAction) {
  const safeSiteKey = JSON.stringify(siteKey);
  const safeAction = JSON.stringify(action);
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer onerror="post({ type: 'turnstile-error', reason: 'script-load-failed' })"></script>
  <style>
    html, body { margin:0; height:100%; font-family:-apple-system,BlinkMacSystemFont,sans-serif; background:#fff; }
    body { display:flex; align-items:center; justify-content:center; }
  </style>
</head>
<body>
  <div id="turnstile-widget"></div>
  <script>
    function post(payload) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
    function markStatus(message) { post({ type: "turnstile-status", message: message }); }
    var rendered = false;
    function renderTurnstile() {
      if (rendered) { return; }
      if (!window.turnstile || !turnstile.render) {
        markStatus("Waiting for Cloudflare script");
        setTimeout(renderTurnstile, 250);
        return;
      }
      rendered = true;
      markStatus("Rendering Cloudflare widget");
      turnstile.render("#turnstile-widget", {
        sitekey: ${safeSiteKey},
        action: ${safeAction},
        appearance: "always",
        theme: "light",
        callback: function(token) { post({ type: "turnstile-token", token: token }); },
        "error-callback": function() { post({ type: "turnstile-error" }); },
        "expired-callback": function() { turnstile.reset(); }
      });
    }
    window.onload = renderTurnstile;
    setTimeout(function() {
      if (!rendered) { post({ type: "turnstile-error", reason: "load-timeout" }); }
    }, 12000);
  </script>
</body>
</html>`;
}
