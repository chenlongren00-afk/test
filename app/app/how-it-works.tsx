import * as React from "react";
import { Text } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { Card } from "@/components/ui";
import { colors } from "@/theme/colors";

export default function HowItWorksRoute() {
  return (
    <ParityScreen titleKey="howItWorks">
      <Card>
        <Text selectable style={{ color: colors.muted, lineHeight: 22 }}>
          1. Post a task with category, suburb, budget and time.{"\n"}2. Helpers send offers and messages.{"\n"}3. Choose a Helper, secure payment, complete the work and release funds.
        </Text>
      </Card>
    </ParityScreen>
  );
}
