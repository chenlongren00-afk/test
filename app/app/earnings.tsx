import * as React from "react";
import { Text, View } from "react-native";

import { ParityScreen, StatRow } from "@/components/ParityScreen";
import { Card, SectionTitle, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";
import { compactDate, money } from "@/utils/format";

export default function EarningsRoute() {
  const store = useAppStore();
  const completedTasks = store.helperCompletedTasks;
  const total = store.helperEarnings;
  const platformFees = completedTasks.reduce((sum, task) => sum + Number(task.platformFeeAmount || task.feeBreakdown?.platformFeeAmount || 0), 0);
  const proSavings = completedTasks.reduce((sum, task) => sum + Number(task.feeBreakdown?.proSavingsAmount || 0), 0);

  return (
    <ParityScreen titleKey="earnings">
      <Card>
        <StatRow label={store.translate("completedTasks")} value={completedTasks.length} />
        <StatRow label={store.translate("total")} value={money(total)} />
        <StatRow label={store.translate("platformFees")} value={money(platformFees)} />
        <StatRow label={store.translate("proSavings")} value={money(proSavings)} />
      </Card>
      <Card>
        <StatRow label={store.translate("completedAsHelper")} value={completedTasks.length} />
        <StatRow label={store.translate("estimatedEarned")} value={money(total)} />
      </Card>
      <Card>
        <SectionTitle title={store.translate("completedEarnings")} subtitle={store.translate("completedEarningsBody")} />
        {completedTasks.length ? (
          completedTasks.slice(0, 12).map((task) => (
            <View key={task.id} style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: 4, paddingTop: 10 }}>
              <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Text selectable numberOfLines={1} style={{ color: colors.text, flex: 1, fontSize: 14, fontWeight: "900" }}>
                  {task.title}
                </Text>
                <Text selectable style={{ color: colors.primary, fontSize: 14, fontWeight: "900" }}>
                  {money(task.helperPayoutAmount || task.feeBreakdown?.helperPayoutAmount || task.budget)}
                </Text>
              </View>
              <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
                {[task.suburb, compactDate(task.date, task.time), task.paymentStatus, task.payoutStatus].filter(Boolean).join(" · ")}
              </Text>
            </View>
          ))
        ) : (
          <StatusBanner message={store.translate("noCompletedEarningsYet")} />
        )}
      </Card>
    </ParityScreen>
  );
}
