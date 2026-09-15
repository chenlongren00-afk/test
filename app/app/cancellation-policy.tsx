import * as React from "react";
import { Text } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { Card } from "@/components/ui";
import { colors } from "@/theme/colors";

export default function CancellationPolicyRoute() {
  return (
    <ParityScreen titleKey="cancellationPolicy">
      <Card>
        <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
          Cancellation rules depend on task status, payment state, evidence and whether the Helper has started work.
        </Text>
      </Card>
    </ParityScreen>
  );
}
