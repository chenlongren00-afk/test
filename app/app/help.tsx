import * as React from "react";

import { ParityScreen, StatRow } from "@/components/ParityScreen";
import { Card } from "@/components/ui";
import { useAppStore } from "@/state/app-store";

export default function HelpRoute() {
  const store = useAppStore();

  return (
    <ParityScreen titleKey="helpSupport">
      <Card>
        <StatRow label={store.translate("contactEmail")} value="australianshelper@gmail.com" />
        <StatRow label={store.translate("supportHours")} value={store.config.support.hours || "Mon-Fri 9:00-17:00 AEST"} />
      </Card>
    </ParityScreen>
  );
}
