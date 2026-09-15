import * as React from "react";
import { Text, View } from "react-native";

import { api } from "@/api/client";
import { ParityScreen } from "@/components/ParityScreen";
import { AHButton, Card, StatusBanner } from "@/components/ui";
import { diagnoseAndroidPushRegistration } from "@/services/push-notifications";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

type PushDiagnosticPayload = Record<string, unknown> & {
  expoPushConfigured?: boolean | null;
  expoPushCredentialStatus?: string;
  expoPushCredentialMessage?: string;
  deviceTokens?: PushDiagnosticToken[];
  pushDeliveryLog?: PushDiagnosticDelivery[];
};

type PushDiagnosticToken = {
  id?: string;
  platform?: string;
  environment?: string;
  bundleId?: string;
  tokenSuffix?: string;
  active?: boolean;
  lastRegisteredAt?: string;
  lastSentAt?: string;
  lastSentStatus?: string;
  lastReceiptStatus?: string;
  lastReceiptAt?: string;
  lastError?: string;
};

type PushDiagnosticDelivery = {
  id?: string;
  notificationId?: string;
  title?: string;
  type?: string;
  tokenSuffix?: string;
  platform?: string;
  provider?: string;
  expoTicketId?: string;
  status?: string;
  statusCode?: number;
  receiptStatus?: string;
  receiptMessage?: string;
  receiptCheckedAt?: string;
  reason?: string;
  createdAt?: string;
};

export default function NotificationDemoRoute() {
  const store = useAppStore();
  const [diagnostic, setDiagnostic] = React.useState<string>("");
  const [backendDiagnostic, setBackendDiagnostic] = React.useState<PushDiagnosticPayload | null>(null);
  const [running, setRunning] = React.useState(false);

  async function runDiagnostic() {
    setRunning(true);
    try {
      const result = await diagnoseAndroidPushRegistration(store.token);
      const backendDiagnostics = store.token ? await api.pushDiagnostics(store.token).catch((error) => ({ error: error instanceof Error ? error.message : "Backend diagnostics failed." })) : {};
      setBackendDiagnostic(backendDiagnostics as PushDiagnosticPayload);
      setDiagnostic([
        `Status: ${result.ok ? "registered" : "not registered"}`,
        `Platform: ${result.platform}`,
        `Physical device: ${result.isDevice ? "yes" : "no"}`,
        `Permission: ${result.permissionStatus}`,
        `Project ID: ${result.projectId || "missing"}`,
        `Token suffix: ${result.pushTokenSuffix || "none"}`,
        `Expo credentials: ${result.expoPushCredentialStatus || "not checked"}`,
        result.expoPushCredentialMessage ? `Expo message: ${result.expoPushCredentialMessage}` : "",
        result.error ? `Error: ${result.error}` : "",
        "",
        "Backend diagnostics:",
        JSON.stringify(backendDiagnostics, null, 2)
      ].filter(Boolean).join("\n"));
    } finally {
      setRunning(false);
    }
  }

  async function sendRemotePushTest() {
    if (!store.token) {
      setDiagnostic("Login is required before sending a remote push test.");
      return;
    }
    setRunning(true);
    try {
      const payload = await api.sendPushTest(store.token);
      setBackendDiagnostic(payload.diagnostics as PushDiagnosticPayload || null);
      setDiagnostic(JSON.stringify(payload, null, 2));
    } catch (error) {
      setDiagnostic(error instanceof Error ? error.message : "Remote push test failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <ParityScreen titleKey="notificationDemo">
      <Card>
        <StatusBanner message={store.translate("notificationDemoBody")} />
        <AHButton label={running ? store.translate("checkingPushStatus") : store.translate("checkPushStatus")} loading={running} onPress={() => void runDiagnostic()} />
        <AHButton label="Send remote push test" tone="secondary" loading={running} onPress={() => void sendRemotePushTest()} />
        {backendDiagnostic ? <PushDiagnosticsSummary payload={backendDiagnostic} /> : null}
        {diagnostic ? (
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 12 }}>
            <Text selectable style={{ color: colors.text, fontFamily: "monospace", lineHeight: 20 }}>
              {diagnostic}
            </Text>
          </View>
        ) : null}
      </Card>
    </ParityScreen>
  );
}

function PushDiagnosticsSummary({ payload }: { payload: PushDiagnosticPayload }) {
  const tokens = Array.isArray(payload.deviceTokens) ? payload.deviceTokens : [];
  const deliveries = Array.isArray(payload.pushDeliveryLog) ? payload.pushDeliveryLog : [];
  return (
    <View style={{ gap: 10 }}>
      <DiagnosticLine
        label="Expo credentials"
        value={[payload.expoPushCredentialStatus, payload.expoPushCredentialMessage].filter(Boolean).join(" · ")}
        danger={payload.expoPushCredentialStatus === "invalid" || payload.expoPushCredentialStatus === "disabled"}
      />
      <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
        Device diagnostics
      </Text>
      {tokens.length ? tokens.map((token) => (
        <View key={token.id || token.tokenSuffix} style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 4, padding: 12 }}>
          <Text selectable style={{ color: colors.text, fontWeight: "900" }}>
            {token.platform || "unknown"} · {token.tokenSuffix || "no token"} · {token.active === false ? "inactive" : "active"}
          </Text>
          <DiagnosticLine label="Environment" value={token.environment} />
          <DiagnosticLine label="Last sent" value={[token.lastSentStatus, shortDate(token.lastSentAt)].filter(Boolean).join(" · ")} />
          <DiagnosticLine label="Last receipt" value={[token.lastReceiptStatus, shortDate(token.lastReceiptAt)].filter(Boolean).join(" · ")} />
          <DiagnosticLine label="Fail reason" value={token.lastError} danger />
        </View>
      )) : (
        <StatusBanner tone="error" message="No active device token is registered for this account." />
      )}
      <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
        Recent push delivery
      </Text>
      {deliveries.slice(0, 6).map((delivery) => (
        <View key={delivery.id || `${delivery.notificationId}-${delivery.createdAt}`} style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 4, padding: 12 }}>
          <Text selectable style={{ color: colors.text, fontWeight: "900" }}>
            {delivery.title || delivery.type || "Push"} · {delivery.status || "unknown"}
          </Text>
          <DiagnosticLine label="Provider" value={[delivery.provider, delivery.platform, delivery.tokenSuffix].filter(Boolean).join(" · ")} />
          <DiagnosticLine label="Ticket" value={delivery.expoTicketId} />
          <DiagnosticLine label="Receipt" value={[delivery.receiptStatus, delivery.receiptMessage].filter(Boolean).join(" · ")} danger={delivery.receiptStatus === "error"} />
          <DiagnosticLine label="Reason" value={delivery.reason} danger={delivery.status === "failed"} />
        </View>
      ))}
    </View>
  );
}

function DiagnosticLine({ label, value, danger = false }: { label: string; value?: string; danger?: boolean }) {
  if (!value) return null;
  return (
    <Text selectable style={{ color: danger ? colors.danger : colors.muted, fontSize: 12, lineHeight: 18 }}>
      {label}: {value}
    </Text>
  );
}

function shortDate(value?: string) {
  if (!value) return "";
  return value.slice(0, 16).replace("T", " ");
}
