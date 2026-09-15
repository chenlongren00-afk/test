import * as React from "react";
import { Link, type Href } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { Card } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

export default function TrustSafetyRoute() {
  const store = useAppStore();
  return (
    <ParityScreen titleKey="trustSafety">
      <Card>
        <TrustCheckActionRow href={{ pathname: "/profile-edit", params: { focus: "phone" } }} label={store.translate("phoneVerified")} value={store.currentUser?.phoneVerified ? store.translate("completed") : store.translate("required")} />
        <TrustCheckActionRow href={{ pathname: "/profile-edit", params: { focus: "identity" } }} label={store.translate("idVerification")} value={verificationLabel(store.currentUser?.idVerificationStatus, store.translate)} />
        <TrustCheckActionRow href={{ pathname: "/profile-edit", params: { focus: "police" } }} label={store.translate("policeCheck")} value={verificationLabel(store.currentUser?.policeCheckStatus, store.translate)} />
        <TrustCheckActionRow href={{ pathname: "/profile-edit", params: { focus: "wwcc" } }} label={store.translate("workWithChildrenCheck")} value={verificationLabel(store.currentUser?.workingWithChildrenCheckStatus, store.translate)} />
        <TrustCheckActionRow href="/payout" label={store.translate("payoutSetup")} value={store.currentUser?.bankVerified ? store.translate("completed") : store.translate("required")} />
      </Card>
    </ParityScreen>
  );
}

function TrustCheckActionRow({
  href,
  label,
  value
}: {
  href: Href;
  label: string;
  value: string | number;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        style={({ pressed }) => ({
          alignItems: "center",
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          opacity: pressed ? 0.72 : 1,
          paddingVertical: 12
        })}
      >
        <Text selectable style={{ color: colors.muted, flex: 1, fontSize: 16, fontWeight: "800" }}>
          {label}
        </Text>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
            {value}
          </Text>
          <ChevronRight color={colors.muted} size={18} />
        </View>
      </Pressable>
    </Link>
  );
}

function verificationLabel(status: string | undefined, translate: (key: string) => string) {
  return status === "verified" || status === "approved" ? translate("completed") : translate("required");
}
