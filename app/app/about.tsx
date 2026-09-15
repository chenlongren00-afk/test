import * as React from "react";
import { Text } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { Card } from "@/components/ui";
import { colors } from "@/theme/colors";

export default function AboutRoute() {
  return (
    <ParityScreen titleKey="about">
      <Card>
        <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>
          Australian Helper
        </Text>
        <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
          Helper is a local task marketplace for Australia. Taskers can post paid tasks, Helpers can browse matching work, send offers, message safely and complete jobs through one account.
        </Text>
      </Card>
    </ParityScreen>
  );
}
