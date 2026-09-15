import * as React from "react";
import { Text, View } from "react-native";

import { ParityScreen, StatRow } from "@/components/ParityScreen";
import { Card, SectionTitle, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

export default function RewardsRoute() {
  const store = useAppStore();
  const user = store.currentUser;
  const points = Number(user?.rewardPoints || 0);
  const progress = Math.min(1, Math.max(0, Number(user?.rewardProgress || 0)));
  const ledger = (store.state.rewardLedger || []).filter((entry) => !entry.userId || entry.userId === user?.id).slice(0, 8);

  return (
    <ParityScreen titleKey="rewards">
      <Card>
        <StatRow label={store.translate("points")} value={points} />
        <StatRow label={store.translate("rewardTier")} value={user?.rewardTierTitle || store.translate("standardTier")} />
        <StatRow label={store.translate("nextTier")} value={user?.rewardNextTierTitle || store.translate("notAvailable")} />
        <StatRow label={store.translate("pointsToNextTier")} value={user?.rewardPointsToNextTier ?? 0} />
        <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 999, height: 10, overflow: "hidden" }}>
          <View style={{ backgroundColor: colors.accent, height: "100%", width: `${Math.round(progress * 100)}%` }} />
        </View>
      </Card>
      <Card>
        <SectionTitle title={store.translate("recentRewards")} subtitle={store.translate("recentRewardsBody")} />
        {ledger.length ? (
          ledger.map((entry) => (
            <View key={entry.id} style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: 4, paddingTop: 10 }}>
              <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>
                +{entry.points} {store.translate("points")}
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                {[entry.reason || entry.source, entry.createdAt].filter(Boolean).join(" · ")}
              </Text>
            </View>
          ))
        ) : (
          <StatusBanner message={store.translate("noRecentRewards")} />
        )}
      </Card>
      <Card>
        <SectionTitle title={store.translate("howRewardsWork")} subtitle={store.translate("howRewardsWorkBody")} />
        <StatRow label={store.translate("completePaidTasks")} value="+20" />
        <StatRow label={store.translate("fiveStarReview")} value="+10" />
        <StatRow label={store.translate("referralReward")} value="+25" />
      </Card>
    </ParityScreen>
  );
}
