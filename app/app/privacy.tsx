import * as React from "react";
import { Text } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { Card } from "@/components/ui";
import { colors } from "@/theme/colors";

export default function PrivacyRoute() {
  return (
    <ParityScreen titleKey="privacy">
      <Card>
        <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
          Australian Helper collects account, task, message, verification, payment and support data to run the marketplace. Contact australianshelper@gmail.com for privacy requests.
        </Text>
      </Card>
    </ParityScreen>
  );
}
