import * as React from "react";

import { ParityScreen } from "@/components/ParityScreen";
import { Card, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function ComplianceRoute() {
  const store = useAppStore();
  return (
    <ParityScreen titleKey="compliance">
      <Card>
        <StatusBanner message={store.translate("complianceBody")} />
      </Card>
    </ParityScreen>
  );
}
