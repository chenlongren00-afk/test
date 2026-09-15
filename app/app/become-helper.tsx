import * as React from "react";
import { Text } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { Card } from "@/components/ui";
import { colors } from "@/theme/colors";

export default function BecomeHelperRoute() {
  return (
    <ParityScreen titleKey="becomeHelper">
      <Card>
        <Text selectable style={{ color: colors.muted, lineHeight: 22 }}>
          Complete your profile, select skills, verify phone and identity, set payout details, then browse matching tasks.
        </Text>
      </Card>
    </ParityScreen>
  );
}
