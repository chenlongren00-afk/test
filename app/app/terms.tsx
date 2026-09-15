import * as React from "react";
import { Text } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { Card } from "@/components/ui";
import { colors } from "@/theme/colors";

export default function TermsRoute() {
  return (
    <ParityScreen titleKey="terms">
      <Card>
        <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
          By using Australian Helper, users agree to post lawful tasks, communicate respectfully, complete verified identity steps where required, and follow marketplace payment and cancellation rules.
        </Text>
      </Card>
    </ParityScreen>
  );
}
