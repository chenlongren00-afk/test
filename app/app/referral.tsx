import * as React from "react";

import { ParityScreen } from "@/components/ParityScreen";
import { Card, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function ReferralRoute() {
  const store = useAppStore();
  return (
    <ParityScreen titleKey="referral">
      <Card>
        <StatusBanner message={store.translate("referralBody")} />
      </Card>
    </ParityScreen>
  );
}
