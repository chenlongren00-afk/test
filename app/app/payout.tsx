import * as React from "react";
import { Alert, Linking, Text, View } from "react-native";
import { Building2, ExternalLink, Link as LinkIcon, RefreshCw, ShieldCheck } from "lucide-react-native";

import { ParityScreen, StatRow } from "@/components/ParityScreen";
import { AHButton, Card, FeeBreakdownCard, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

export default function PayoutRoute() {
  const store = useAppStore();
  const ready = Boolean(store.currentUser?.bankVerified);
  const [localStatus, setLocalStatus] = React.useState<string | null>(null);
  const payoutTask = store.myAcceptedTasks.find((task) =>
    ["assigned", "in_progress", "payment_requested", "completed", "payment_released"].includes(task.status)
  ) || store.state.tasks[0];

  async function openURLFromResult(action: () => Promise<{ url?: string; error?: string; message?: string }>, fallbackMessage: string) {
    setLocalStatus(store.translate("payoutSetupOpening"));
    const result = await action();
    if (result.error || !result.url) {
      setLocalStatus(result.error || fallbackMessage);
      Alert.alert(store.translate("payout"), result.error || fallbackMessage);
      return;
    }
    const opened = await Linking.openURL(result.url).then(() => true).catch(() => false);
    setLocalStatus(opened ? (result.message || store.translate("payoutSetupNeedsAction")) : fallbackMessage);
    if (!opened) Alert.alert(store.translate("payout"), fallbackMessage);
  }

  async function refreshStatus() {
    const message = await store.refreshPayoutStatus();
    if (message) {
      setLocalStatus(message);
      Alert.alert(store.translate("payout"), message);
      return;
    }
    setLocalStatus(ready ? store.translate("payoutSetupReady") : store.translate("payoutSetupNeedsAction"));
  }

  return (
    <ParityScreen titleKey="payout">
      <Card>
        <StatRow label={store.translate("stripeConnect")} value={ready ? store.translate("completed") : store.translate("setupRequired")} />
        <StatRow label={store.translate("payoutStatus")} value={ready ? store.translate("completed") : store.translate("setupRequired")} />
        <StatusBanner message={ready ? store.translate("payoutSetupReady") : store.translate("androidPayoutSetupBody")} tone={ready ? "success" : "info"} />
        {localStatus ? <StatusBanner message={localStatus} tone={ready ? "success" : "info"} /> : null}
        <View style={{ gap: 10 }}>
          <AHButton
            label={store.translate("connectStripeAccount")}
            icon={<LinkIcon color={colors.surface} size={18} />}
            loading={store.isSubmitting}
            onPress={() => void openURLFromResult(store.createPayoutAccountLink, store.translate("somethingWentWrong"))}
          />
          <AHButton
            label={store.translate("verifyBankDetails")}
            tone="secondary"
            icon={<Building2 color={colors.primary} size={18} />}
            loading={store.isSubmitting}
            onPress={() => void openURLFromResult(store.createPayoutAccountLink, store.translate("somethingWentWrong"))}
          />
          <AHButton
            label={store.translate("viewPayoutDashboard")}
            tone="secondary"
            icon={<ExternalLink color={colors.primary} size={18} />}
            loading={store.isSubmitting}
            onPress={() => void openURLFromResult(store.createPayoutDashboardLink, store.translate("somethingWentWrong"))}
          />
          <AHButton
            label={store.translate("refreshPayoutStatus")}
            tone="secondary"
            icon={<RefreshCw color={colors.primary} size={18} />}
            loading={store.isSubmitting}
            onPress={() => void refreshStatus()}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <ShieldCheck color={colors.primary} size={18} />
          <Text selectable style={{ color: colors.muted, flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 17 }}>
            {store.translate("payoutSetupLegalNote")}
          </Text>
        </View>
      </Card>
      <FeeBreakdownCard breakdown={payoutTask?.feeBreakdown} amount={payoutTask?.budget || 0} />
    </ParityScreen>
  );
}
